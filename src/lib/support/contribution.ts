/**
 * Contribution rules shared by the Support page and the Razorpay order function,
 * so client and server validate identically.
 */
export const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN', presets: [99, 199, 499, 999], min: 1, max: 500_000, decimals: 2 },
  USD: { symbol: '$', locale: 'en-US', presets: [3, 5, 10, 25], min: 1, max: 5_000, decimals: 2 },
  EUR: { symbol: '€', locale: 'en-IE', presets: [3, 5, 10, 25], min: 1, max: 5_000, decimals: 2 },
  GBP: { symbol: '£', locale: 'en-GB', presets: [3, 5, 10, 25], min: 1, max: 5_000, decimals: 2 },
} as const;

export type Currency = keyof typeof CURRENCIES;
export type Rail = 'domestic' | 'international';

export const INTERNATIONAL_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP'];

export const isCurrency = (value: string): value is Currency => Object.hasOwn(CURRENCIES, value);

export function formatAmount(amount: number, currency: Currency): string {
  const { locale, decimals } = CURRENCIES[currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/** Strips anything but digits and a single decimal point, capped to the currency's precision. */
export function sanitizeAmountInput(raw: string, currency: Currency): string {
  const { decimals } = CURRENCIES[currency];
  const cleaned = raw.replace(/[^\d.]/g, '');
  const [whole = '', ...rest] = cleaned.split('.');
  const fraction = rest.join('').slice(0, decimals);
  return (decimals > 0 && cleaned.includes('.') ? `${whole}.${fraction}` : whole).slice(0, 10);
}

export type AmountCheck = { ok: true; amount: number } | { ok: false; error: string };

export function validateAmount(amount: number, currency: Currency): AmountCheck {
  const { min, max } = CURRENCIES[currency];
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter an amount.' };
  if (amount < min) return { ok: false, error: `Minimum is ${formatAmount(min, currency)}.` };
  if (amount > max) return { ok: false, error: `Maximum is ${formatAmount(max, currency)}.` };
  return { ok: true, amount };
}

/** Razorpay expects the smallest currency unit (paise / cents). */
export const toMinorUnits = (amount: number): number => Math.round(amount * 100);
