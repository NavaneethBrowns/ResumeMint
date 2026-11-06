import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { isCurrency, validateAmount, type Currency } from '../src/lib/support/contribution';

/**
 * Server-only. Keys are read per call so a missing configuration yields a clean 503
 * instead of a crash at import time.
 */
const ID = /^[A-Za-z0-9_]{6,64}$/;
const SIGNATURE = /^[a-f0-9]{64}$/;
const RECEIPT = /^[A-Za-z0-9_-]{1,40}$/;

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}

export const isRazorpayId = (value: unknown): value is string => typeof value === 'string' && ID.test(value);
export const isRazorpaySignature = (value: unknown): value is string => typeof value === 'string' && SIGNATURE.test(value);

export type OrderInput =
  | { ok: true; amount: number; currency: Currency; receipt?: string }
  | { ok: false; error: string };

/** Validates an untrusted order request whose amount is in the smallest currency unit. */
export function parseOrderInput(body: unknown): OrderInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Invalid request body.' };
  const { amount, currency, receipt } = body as Record<string, unknown>;
  if (typeof currency !== 'string' || !isCurrency(currency)) return { ok: false, error: 'Unsupported currency.' };
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount)) {
    return { ok: false, error: 'Amount must be a whole number in the smallest currency unit.' };
  }
  const check = validateAmount(amount / 100, currency);
  if (!check.ok) return { ok: false, error: check.error };
  if (receipt !== undefined && (typeof receipt !== 'string' || !RECEIPT.test(receipt))) {
    return { ok: false, error: 'Receipt must be 1-40 letters, numbers, underscores, or hyphens.' };
  }
  return { ok: true, amount, currency, receipt };
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: Currency;
}

export class RazorpayConnectionError extends Error {
  constructor(readonly code: string) {
    super('Could not connect to the payment provider.');
    this.name = 'RazorpayConnectionError';
  }
}

function configureRequest(api: unknown, onConnectionError: (code: string) => void): void {
  // The SDK exposes its Axios instance but does not preserve network errors.
  if (
    typeof api !== 'object' ||
    api === null ||
    !('rq' in api) ||
    (typeof api.rq !== 'function' && typeof api.rq !== 'object') ||
    api.rq === null ||
    !('defaults' in api.rq) ||
    typeof api.rq.defaults !== 'object' ||
    api.rq.defaults === null ||
    !('timeout' in api.rq.defaults) ||
    !('interceptors' in api.rq) ||
    typeof api.rq.interceptors !== 'object' ||
    api.rq.interceptors === null ||
    !('response' in api.rq.interceptors) ||
    typeof api.rq.interceptors.response !== 'object' ||
    api.rq.interceptors.response === null ||
    !('use' in api.rq.interceptors.response) ||
    typeof api.rq.interceptors.response.use !== 'function'
  ) {
    throw new Error('Razorpay SDK request could not be configured.');
  }
  api.rq.defaults.timeout = 10_000;
  api.rq.interceptors.response.use(undefined, (error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      error.isAxiosError === true &&
      (!('response' in error) || !error.response)
    ) {
      const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
      onConnectionError(/^[A-Z0-9_]{1,60}$/.test(code) ? code : 'UNKNOWN');
    }
    return Promise.reject(error);
  });
}

export async function createOrder(
  cfg: RazorpayConfig,
  amount: number,
  currency: Currency,
  receipt?: string,
): Promise<RazorpayOrder> {
  const client = new Razorpay({ key_id: cfg.keyId, key_secret: cfg.keySecret });
  const connectionError: { code?: string } = {};
  configureRequest(client.api, (code) => {
    connectionError.code = code;
  });

  try {
    const order = await client.orders.create({
      amount,
      currency,
      receipt: receipt ?? `rm_${randomUUID().replace(/-/g, '')}`,
      notes: { purpose: 'Resumint support contribution' },
    });

    if (!isRazorpayId(order.id) || order.amount !== amount || order.currency !== currency) {
      throw new Error('Razorpay returned an invalid order.');
    }
    return { id: order.id, amount, currency };
  } catch (error) {
    if (connectionError.code) throw new RazorpayConnectionError(connectionError.code);
    throw error;
  }
}

const safeEqualHex = (expected: string, received: string) => {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Binds the order returned by the server to the later checkout callback without a database. */
export function createOrderToken(secret: string, orderId: string): string {
  return createHmac('sha256', secret).update(`resumint:checkout-order:v1|${orderId}`).digest('hex');
}

export function verifyOrderToken(secret: string, orderId: string, token: string): boolean {
  return safeEqualHex(createOrderToken(secret, orderId), token);
}

/** Checkout success signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(secret: string, orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw request body, webhook_secret). */
export function verifyWebhookSignature(secret: string, rawBody: string, signature: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
