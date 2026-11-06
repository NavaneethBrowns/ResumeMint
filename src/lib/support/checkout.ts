import { toMinorUnits, type Currency } from './contribution';

/** The subset of Razorpay Checkout we use. Docs: razorpay.com/docs/payments/payment-gateway/web-integration/standard */
interface CheckoutSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface CheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  theme?: { color: string; backdrop_color?: string };
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
  handler: (res: CheckoutSuccess) => void;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (res: { error: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const THEME = { color: '#10b981', backdrop_color: '#0b1f1c' };
let scriptPromise: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    const fail = () => {
      window.clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      script.remove();
      scriptPromise = null;
      reject(new Error('Could not load the secure checkout. Check your connection and try again.'));
    };
    const timeout = window.setTimeout(fail, 15_000);
    script.onload = () => {
      if (!window.Razorpay) {
        fail();
        return;
      }
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = fail;
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export type CheckoutResult =
  | { status: 'success'; paymentId: string }
  | { status: 'dismissed' }
  | { status: 'failed'; message: string };

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (error) {
    console.error('[checkout] Payment server request failed', { url, errorName: error instanceof Error ? error.name : 'UnknownError' });
    throw new Error('Could not reach the payment server. Check your connection and try again.');
  }
  try {
    const data: unknown = await res.json();
    return { ok: res.ok, data };
  } catch {
    throw new Error('The payment server returned an unexpected response. Please try again.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const confirmationError = 'We could not confirm the payment. If you were charged, please contact us before trying again.';

/** Creates an order server-side, opens Razorpay Checkout, then verifies the signature server-side. */
export async function startContribution(
  amount: number,
  currency: Currency,
  onPaymentFailed?: (message: string) => void,
): Promise<CheckoutResult> {
  const amountMinor = toMinorUnits(amount);
  const order = await postJson('/api/razorpay/order', { amount: amountMinor, currency });
  if (!order.ok) {
    const message = isRecord(order.data) && typeof order.data.error === 'string' ? order.data.error : 'Could not start checkout.';
    return { status: 'failed', message };
  }
  const data = order.data;
  if (
    !isRecord(data) ||
    typeof data.order_id !== 'string' ||
    !data.order_id ||
    data.amount !== amountMinor ||
    data.currency !== currency ||
    typeof data.key_id !== 'string' ||
    !data.key_id ||
    typeof data.order_token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(data.order_token)
  ) {
    return { status: 'failed', message: 'The payment server returned an invalid order. Please try again.' };
  }
  const { order_id: orderId, key_id: keyId, order_token: orderToken } = data;

  await loadCheckout();
  const Razorpay = window.Razorpay;
  if (!Razorpay) return { status: 'failed', message: 'Checkout is unavailable right now.' };

  return new Promise<CheckoutResult>((resolve) => {
    let lastError: string | null = null;
    let verifying = false;
    const rzp = new Razorpay({
      key: keyId,
      order_id: orderId,
      amount: amountMinor,
      currency,
      name: 'Resumint',
      description: 'Support Resumint',
      theme: THEME,
      modal: {
        ondismiss: () => {
          if (!verifying) resolve(lastError ? { status: 'failed', message: lastError } : { status: 'dismissed' });
        },
        confirm_close: true,
      },
      handler: async (res) => {
        verifying = true;
        if (
          !res ||
          res.razorpay_order_id !== orderId ||
          typeof res.razorpay_payment_id !== 'string' ||
          typeof res.razorpay_signature !== 'string'
        ) {
          resolve({ status: 'failed', message: confirmationError });
          return;
        }
        try {
          const v = await postJson('/api/razorpay/verify', { ...res, order_token: orderToken });
          resolve(
            v.ok && isRecord(v.data) && v.data.verified === true && v.data.paymentId === res.razorpay_payment_id
              ? { status: 'success', paymentId: res.razorpay_payment_id }
              : { status: 'failed', message: confirmationError },
          );
        } catch (error) {
          console.error('[checkout] Payment verification request failed', error);
          resolve({ status: 'failed', message: confirmationError });
        }
      },
    });
    rzp.on('payment.failed', (res) => {
      if (verifying) return;
      lastError = res.error?.description || 'Payment failed. Please try again.';
      onPaymentFailed?.(lastError);
    });
    rzp.open();
  });
}
