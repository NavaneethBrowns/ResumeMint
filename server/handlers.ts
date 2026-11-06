import {
  createOrder,
  createOrderToken,
  getRazorpayConfig,
  isRazorpayId,
  isRazorpaySignature,
  parseOrderInput,
  RazorpayConnectionError,
  verifyOrderToken,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from './razorpay';

/** Web-standard Request → Response handlers, wrapped by the Netlify functions in netlify/functions. */
const MAX_BODY = 1_000;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const notEnabled = () => json({ error: 'Contributions are not enabled yet.' }, 503);

type JsonBody = { ok: true; body: unknown } | { ok: false; response: Response };

async function readJson(request: Request): Promise<JsonBody> {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return { ok: false, response: json({ error: 'Request too large.' }, 413) };
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, response: json({ error: 'Invalid JSON.' }, 400) };
  }
}

function getGatewayStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return undefined;
  const status = error.statusCode;
  if (typeof status === 'number' && Number.isInteger(status)) return status;
  if (typeof status === 'string' && /^\d{3}$/.test(status)) return Number(status);
  return undefined;
}

export async function handleOrder(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const cfg = getRazorpayConfig();
  if (!cfg) return notEnabled();

  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const input = parseOrderInput(parsed.body);
  if (!input.ok) return json({ error: input.error }, 400);

  try {
    const order = await createOrder(cfg, input.amount, input.currency, input.receipt);
    return json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: cfg.keyId,
      order_token: createOrderToken(cfg.keySecret, order.id),
    });
  } catch (error) {
    if (error instanceof RazorpayConnectionError) {
      console.error(`[razorpay/order] Payment provider connection failed (${error.code}). Check server DNS, proxy, and network access.`);
      return json({ error: 'The payment service is temporarily unreachable. Please try again later.' }, 503);
    }
    const gatewayStatus = getGatewayStatus(error);
    console.error(`[razorpay/order] Could not create order. Gateway HTTP status: ${gatewayStatus ?? 'unavailable'}.`);
    if (gatewayStatus === 401 || gatewayStatus === 403) {
      return json({ error: 'Payment service authentication failed. Please try again later.' }, 401);
    }
    return json({ error: 'Could not start checkout. Please try again.' }, 500);
  }
}

/**
 * Verifies the server-issued order reference and Razorpay's checkout signature.
 * This does not confirm capture or persist payment records.
 */
export async function handleVerify(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const cfg = getRazorpayConfig();
  if (!cfg) return notEnabled();

  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const { body } = parsed;
  const malformed = () => json({ verified: false, error: 'Malformed payment response.' }, 400);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return malformed();

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    order_token: orderToken,
  } = body as Record<string, unknown>;
  if (!isRazorpayId(orderId) || !isRazorpayId(paymentId) || !isRazorpaySignature(signature) || !isRazorpaySignature(orderToken)) {
    return malformed();
  }

  if (!verifyOrderToken(cfg.keySecret, orderId, orderToken) || !verifyPaymentSignature(cfg.keySecret, orderId, paymentId, signature)) {
    console.warn('[razorpay/verify] Order reference or signature mismatch.');
    return json({ verified: false, error: 'Payment verification failed.' }, 400);
  }
  return json({ verified: true, paymentId });
}

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks). Subscribe to
 * payment.captured, payment.failed and refund.processed.
 *
 * Razorpay may deliver the same event more than once; `x-razorpay-event-id` is the
 * idempotency key. Events are verified and logged, not persisted.
 */
export async function handleWebhook(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return json({ error: 'Webhook not configured.' }, 503);

  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const eventId = request.headers.get('x-razorpay-event-id') ?? 'unknown';
  const raw = await request.text();

  if (!signature || !verifyWebhookSignature(secret, raw, signature)) {
    console.warn('[razorpay/webhook] invalid signature', { eventId });
    return json({ error: 'Invalid signature.' }, 400);
  }

  try {
    const event = JSON.parse(raw) as {
      event: string;
      payload?: { payment?: { entity?: { id: string; amount: number; currency: string; method?: string; status: string } } };
    };
    const payment = event.payload?.payment?.entity;
    console.info('[razorpay/webhook]', {
      eventId,
      event: event.event,
      paymentId: payment?.id,
      amount: payment?.amount,
      currency: payment?.currency,
      method: payment?.method,
      status: payment?.status,
    });
  } catch (error) {
    console.error('[razorpay/webhook] unparseable payload', { eventId, error });
  }

  // Always 200 once the signature is valid so Razorpay stops retrying.
  return json({ received: true });
}
