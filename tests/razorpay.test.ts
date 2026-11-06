import { createHmac, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter, AxiosStatic } from 'axios';
import { handleOrder, handleVerify, handleWebhook } from '../server/handlers';
import {
  createOrderToken,
  getRazorpayConfig,
  parseOrderInput,
  verifyOrderToken,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../server/razorpay';
import { startContribution } from '../src/lib/support/checkout';
import { isCurrency, sanitizeAmountInput, toMinorUnits, validateAmount } from '../src/lib/support/contribution';

const requireFromProject = createRequire(import.meta.url);
const requireFromRazorpay = createRequire(requireFromProject.resolve('razorpay'));
const axios: AxiosStatic = requireFromRazorpay('axios').default;

const testKey = 'rzp_test_mock';
const testSecret = randomBytes(32).toString('hex');
const orderId = 'order_test123456';
const paymentId = 'pay_test123456';
const paymentSignature = () => createHmac('sha256', testSecret).update(`${orderId}|${paymentId}`).digest('hex');
const orderToken = () => createOrderToken(testSecret, orderId);
const savedEnv = { ...process.env };

beforeAll(() => {
  process.env.RAZORPAY_KEY_ID = testKey;
  process.env.RAZORPAY_KEY_SECRET = testSecret;
});

afterAll(() => {
  for (const name of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const post = (body: unknown, raw?: string) =>
  new Request('http://localhost/api/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });

async function withGatewayAdapter(adapter: AxiosAdapter, run: () => Promise<void>) {
  const previous = axios.defaults.adapter;
  axios.defaults.adapter = adapter;
  try {
    await run();
  } finally {
    axios.defaults.adapter = previous;
  }
}

const okOrder: AxiosAdapter = async (config) => {
  const body: unknown = JSON.parse(config.data);
  if (!isRecord(body)) throw new Error('Unexpected order body');
  return { data: { id: orderId, amount: body.amount, currency: body.currency }, status: 200, statusText: 'OK', headers: {}, config };
};

describe('contribution rules', () => {
  it('validates integer minor-unit amounts, currencies, limits, and receipts', () => {
    expect(validateAmount(1, 'INR').ok).toBe(true);
    expect(sanitizeAmountInput('₹1.505abc', 'INR')).toBe('1.50');
    expect(toMinorUnits(1.5)).toBe(150);
    for (const amount of [100, 150, 50_000_000]) expect(parseOrderInput({ amount, currency: 'INR' }).ok).toBe(true);
    for (const amount of [-1, 0, 99, 100.5, 50_000_001, Number.MAX_SAFE_INTEGER + 1, '100']) {
      expect(parseOrderInput({ amount, currency: 'INR' }).ok).toBe(false);
    }
    for (const currency of ['toString', 'constructor', '__proto__', 'XYZ']) {
      expect(isCurrency(currency)).toBe(false);
      expect(parseOrderInput({ amount: 100, currency }).ok).toBe(false);
    }
    for (const receipt of ['', 'invalid receipt', 'x'.repeat(41), null]) {
      expect(parseOrderInput({ amount: 100, currency: 'INR', receipt }).ok).toBe(false);
    }
    expect(parseOrderInput({ amount: 100, currency: 'INR', receipt: 'receipt_1-a' }).ok).toBe(true);
    expect(parseOrderInput(null).ok).toBe(false);
    expect(parseOrderInput([]).ok).toBe(false);
  });

  it('requires both the key ID and secret', () => {
    expect(getRazorpayConfig()).toEqual({ keyId: testKey, keySecret: testSecret });
    delete process.env.RAZORPAY_KEY_SECRET;
    try {
      expect(getRazorpayConfig()).toBeNull();
    } finally {
      process.env.RAZORPAY_KEY_SECRET = testSecret;
    }
  });
});

describe('order function', () => {
  it('creates orders in minor units with a timeout and a signed order token', async () => {
    const receipts: string[] = [];
    await withGatewayAdapter(async (config) => {
      expect(config.url).toBe('/v1/orders');
      expect(config.timeout).toBe(10_000);
      expect(config.auth).toEqual({ username: testKey, password: testSecret });
      receipts.push(JSON.parse(config.data).receipt);
      return okOrder(config);
    }, async () => {
      const response = await handleOrder(post({ amount: 100, currency: 'INR' }));
      expect(response.status).toBe(200);
      const data: unknown = await response.json();
      expect(data).toEqual({ order_id: orderId, amount: 100, currency: 'INR', key_id: testKey, order_token: orderToken() });
      expect(JSON.stringify(data)).not.toContain(testSecret);
      await handleOrder(post({ amount: 100, currency: 'INR', receipt: 'receipt_1-a' }));
    });
    expect(receipts[0]).toMatch(/^rm_[a-f0-9]{32}$/);
    expect(receipts[1]).toBe('receipt_1-a');
  });

  it('rejects invalid requests before calling the gateway', async () => {
    await withGatewayAdapter(async () => {
      throw new Error('Gateway should not be called for invalid input');
    }, async () => {
      for (const body of [null, [], {}, { amount: 99, currency: 'INR' }, { amount: 100, currency: 'toString' }]) {
        expect((await handleOrder(post(body))).status).toBe(400);
      }
      expect((await handleOrder(post(null, '{'))).status).toBe(400);
      expect((await handleOrder(post(null, ' '.repeat(1_001)))).status).toBe(413);
      expect((await handleOrder(new Request('http://localhost/api/razorpay/order'))).status).toBe(405);
    });
  });

  it('maps gateway authentication failures to 401 and other failures to 500', async () => {
    for (const status of [401, 403, 500]) {
      await withGatewayAdapter(async (config) => {
        throw new axios.AxiosError('Mock gateway error', 'ERR_BAD_RESPONSE', config, undefined, {
          data: { error: { code: 'MOCK_ERROR' } }, status, statusText: 'Mock failure', headers: {}, config,
        });
      }, async () => {
        expect((await handleOrder(post({ amount: 100, currency: 'INR' }))).status).toBe(status === 500 ? 500 : 401);
      });
    }
    await withGatewayAdapter(async (config) => ({
      data: { id: orderId, amount: 200, currency: 'INR' }, status: 200, statusText: 'OK', headers: {}, config,
    }), async () => {
      expect((await handleOrder(post({ amount: 100, currency: 'INR' }))).status).toBe(500);
    });
  });

  it('reports connection failures as 503 without exposing credentials', async () => {
    for (const code of ['ENOTFOUND', 'ECONNREFUSED', 'invalid\ncode']) {
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
      await withGatewayAdapter(async (config) => {
        throw new axios.AxiosError(`Mock error containing ${testSecret}`, code, config);
      }, async () => {
        const response = await handleOrder(post({ amount: 100, currency: 'INR' }));
        expect(response.status).toBe(503);
      });
      const logged = errorLog.mock.calls.map((args) => args.map(String).join(' ')).join('\n');
      errorLog.mockRestore();
      expect(logged).toContain(code === 'invalid\ncode' ? '(UNKNOWN)' : `(${code})`);
      expect(logged).not.toContain(testSecret);
    }
  });

  it('returns 503 when payment configuration is missing', async () => {
    delete process.env.RAZORPAY_KEY_SECRET;
    try {
      expect((await handleOrder(post({ amount: 100, currency: 'INR' }))).status).toBe(503);
      expect((await handleVerify(post({}))).status).toBe(503);
    } finally {
      process.env.RAZORPAY_KEY_SECRET = testSecret;
    }
  });
});

describe('verify function', () => {
  it('accepts only the server-issued order token and a valid payment signature', async () => {
    const payload = {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: paymentSignature(),
      order_token: orderToken(),
    };
    expect(verifyOrderToken(testSecret, orderId, orderToken())).toBe(true);
    expect(verifyPaymentSignature(testSecret, orderId, paymentId, paymentSignature())).toBe(true);
    const response = await handleVerify(post(payload));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ verified: true, paymentId });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const invalid of [
      null,
      [],
      {},
      { ...payload, order_token: undefined },
      { ...payload, order_token: '0'.repeat(64) },
      { ...payload, razorpay_order_id: 'order_other123456' },
      { ...payload, razorpay_signature: '0'.repeat(64) },
      { ...payload, razorpay_signature: 'not-a-signature' },
    ]) {
      const rejected = await handleVerify(post(invalid));
      expect(rejected.status).toBe(400);
      expect(await rejected.json()).toMatchObject({ verified: false });
    }
    warn.mockRestore();
    expect((await handleVerify(post(null, '{'))).status).toBe(400);
    expect((await handleVerify(post(null, ' '.repeat(1_001)))).status).toBe(413);
  });
});

describe('webhook function', () => {
  it('verifies the webhook signature', async () => {
    const raw = JSON.stringify({ event: 'payment.captured' });
    const signature = createHmac('sha256', testSecret).update(raw).digest('hex');
    expect(verifyWebhookSignature(testSecret, raw, signature)).toBe(true);
    expect(verifyWebhookSignature(testSecret, `${raw} `, signature)).toBe(false);

    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    expect((await handleWebhook(post(null, raw))).status).toBe(503);

    process.env.RAZORPAY_WEBHOOK_SECRET = testSecret;
    const signed = (sig: string) =>
      new Request('http://localhost/api/razorpay/webhook', { method: 'POST', headers: { 'x-razorpay-signature': sig }, body: raw });
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await handleWebhook(signed(signature))).status).toBe(200);
    expect((await handleWebhook(signed('0'.repeat(64)))).status).toBe(400);
    info.mockRestore();
    warn.mockRestore();
  });
});

describe('browser checkout', () => {
  type Callback = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
  type StubOptions = {
    key: string;
    order_id: string;
    amount: number;
    currency: string;
    handler: (res: Callback) => void | Promise<void>;
    modal: { ondismiss: () => void };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function harness(options: { orderResponse?: unknown; orderStatus?: number; verifyResponse?: unknown } = {}) {
    let onOpen: (checkout: StubCheckout) => void = () => {};
    class StubCheckout {
      failureHandler?: (res: { error: { description?: string } }) => void;
      constructor(readonly options: StubOptions) {}
      on(_event: 'payment.failed', handler: (res: { error: { description?: string } }) => void) {
        this.failureHandler = handler;
      }
      open() {
        onOpen(this);
      }
    }
    const opened = new Promise<StubCheckout>((resolve) => {
      onOpen = resolve;
    });
    const calls: { url: string; body: unknown }[] = [];
    vi.stubGlobal('window', { Razorpay: StubCheckout });
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      if (url === '/api/razorpay/order') {
        return Response.json(
          options.orderResponse ?? { order_id: orderId, amount: 100, currency: 'INR', key_id: testKey, order_token: orderToken() },
          { status: options.orderStatus ?? 200 },
        );
      }
      return Response.json(options.verifyResponse ?? { verified: true, paymentId });
    });
    return { opened, calls };
  }

  const callback = (): Callback => ({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: paymentSignature() });

  it('sends paise, opens checkout, and verifies all callback fields', async () => {
    const h = harness();
    const result = startContribution(1, 'INR');
    const checkout = await h.opened;
    expect(checkout.options).toMatchObject({ order_id: orderId, amount: 100, currency: 'INR', key: testKey });
    expect(h.calls[0]).toEqual({ url: '/api/razorpay/order', body: { amount: 100, currency: 'INR' } });
    await checkout.options.handler(callback());
    expect(await result).toEqual({ status: 'success', paymentId });
    expect(h.calls[1]).toEqual({ url: '/api/razorpay/verify', body: { ...callback(), order_token: orderToken() } });
  });

  it('reports dismissal and failed payments', async () => {
    const dismissed = harness();
    const first = startContribution(1, 'INR');
    (await dismissed.opened).options.modal.ondismiss();
    expect(await first).toEqual({ status: 'dismissed' });

    vi.unstubAllGlobals();
    const failed = harness();
    const errors: string[] = [];
    const second = startContribution(1, 'INR', (message) => errors.push(message));
    const checkout = await failed.opened;
    checkout.failureHandler?.({ error: { description: 'Card was declined.' } });
    checkout.options.modal.ondismiss();
    expect(errors).toEqual(['Card was declined.']);
    expect(await second).toEqual({ status: 'failed', message: 'Card was declined.' });
  });

  it('does not claim success when verification fails', async () => {
    const h = harness({ verifyResponse: { verified: false } });
    const result = startContribution(1, 'INR');
    await (await h.opened).options.handler(callback());
    expect(await result).toMatchObject({ status: 'failed' });
  });

  it('rejects malformed orders and shows server errors without opening checkout', async () => {
    harness({ orderResponse: { order_id: orderId, amount: 999, currency: 'INR', key_id: testKey, order_token: orderToken() } });
    expect(await startContribution(1, 'INR')).toMatchObject({ status: 'failed' });

    vi.unstubAllGlobals();
    harness({ orderResponse: { error: 'Contributions are not enabled yet.' }, orderStatus: 503 });
    expect(await startContribution(1, 'INR')).toEqual({ status: 'failed', message: 'Contributions are not enabled yet.' });
  });
});
