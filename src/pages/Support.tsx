import { useId, useState } from 'react';
import { ArrowLeft, Heart, Lock } from 'lucide-react';
import { navigate } from '../lib/router';
import { Brand } from '../components/Brand';
import { startContribution } from '../lib/support/checkout';
import {
  CURRENCIES,
  INTERNATIONAL_CURRENCIES,
  formatAmount,
  isCurrency,
  sanitizeAmountInput,
  validateAmount,
  type Currency,
  type Rail,
} from '../lib/support/contribution';

const RAILS: Record<Rail, { title: string; sub: string }> = {
  domestic: { title: 'India', sub: 'UPI · Cards · Netbanking' },
  international: { title: 'International', sub: 'Visa · Mastercard · Amex' },
};

export const Support = () => {
  const ids = { custom: useId(), currency: useId(), error: useId() };
  const [rail, setRail] = useState<Rail>('domestic');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [preset, setPreset] = useState<number | null>(CURRENCIES.INR.presets[1]);
  const [custom, setCustom] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cfg = CURRENCIES[currency];
  const amount = custom ? Number.parseFloat(custom) : (preset ?? 0);
  const check = validateAmount(amount, currency);
  const showError = !check.ok && (custom !== '' || preset === null);

  const switchRail = (next: Rail) => {
    const nextCurrency: Currency = next === 'domestic' ? 'INR' : 'USD';
    setRail(next);
    setCurrency(nextCurrency);
    setPreset(CURRENCIES[nextCurrency].presets[1]);
    setCustom('');
    setNotice(null);
  };

  const switchCurrency = (value: string) => {
    if (!isCurrency(value)) return;
    setCurrency(value);
    setPreset(CURRENCIES[value].presets[1]);
    setCustom('');
  };

  const contribute = async () => {
    if (!check.ok || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await startContribution(check.amount, currency, setNotice);
      if (result.status === 'success') {
        setNotice(`Thank you! Your payment of ${formatAmount(check.amount, currency)} was verified (ref ${result.paymentId}).`);
      } else if (result.status === 'failed') {
        setNotice(result.message);
      } else {
        setNotice('Checkout closed before payment confirmation.');
      }
    } catch (error) {
      console.error('[support] checkout error', error);
      setNotice(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="support-page">
      <header className="topbar">
        <Brand onClick={() => navigate('/')} />
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          <ArrowLeft size={15} /> Back
        </button>
      </header>

      <main className="support-wrap">
        <section className="support-card card">
          <span className="support-icon"><Heart size={22} /></span>
          <span className="kicker">Support us</span>
          <h1>Keep Resumint free for everyone.</h1>
          <p className="support-lead">
            Resumint has no paywalls, watermarks or accounts. A voluntary contribution helps cover hosting and new templates and features.
          </p>

          <div role="radiogroup" aria-label="Payment region" className="support-rails">
            {(Object.keys(RAILS) as Rail[]).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={rail === r}
                disabled={busy}
                className={`support-rail${rail === r ? ' active' : ''}`}
                onClick={() => switchRail(r)}
              >
                <strong>{RAILS[r].title}</strong>
                <small>{RAILS[r].sub}</small>
              </button>
            ))}
          </div>

          {rail === 'international' && (
            <div className="support-currency">
              <label htmlFor={ids.currency}>Currency</label>
              <select id={ids.currency} className="input" value={currency} disabled={busy} onChange={(e) => switchCurrency(e.target.value)}>
                {INTERNATIONAL_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div role="radiogroup" aria-label="Contribution amount" className="support-presets">
            {cfg.presets.map((value) => {
              const active = !custom && preset === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={busy}
                  className={`filter-pill${active ? ' active' : ''}`}
                  onClick={() => {
                    setPreset(value);
                    setCustom('');
                  }}
                >
                  {formatAmount(value, currency)}
                </button>
              );
            })}
          </div>

          <label htmlFor={ids.custom} className="sr-only">Custom amount in {currency}</label>
          <div className={`support-amount${showError ? ' invalid' : ''}`}>
            <span>{cfg.symbol}</span>
            <input
              id={ids.custom}
              inputMode="decimal"
              autoComplete="off"
              placeholder="Custom amount"
              value={custom}
              disabled={busy}
              aria-invalid={showError}
              aria-describedby={showError ? ids.error : undefined}
              onChange={(e) => {
                setCustom(sanitizeAmountInput(e.target.value, currency));
                setPreset(null);
                setNotice(null);
              }}
            />
            <small>{currency}</small>
          </div>
          {showError && !check.ok && (
            <p id={ids.error} role="alert" className="support-error">{check.error}</p>
          )}

          <button type="button" className="btn btn-primary btn-lg support-cta" onClick={contribute} disabled={!check.ok || busy} aria-busy={busy}>
            <Lock size={16} />
            {busy ? 'Checkout in progress…' : `Contribute ${check.ok ? formatAmount(check.amount, currency) : ''} securely`}
          </button>

          <p aria-live="polite" className="support-notice">{notice}</p>
          <p className="support-fine">
            Payments processed by Razorpay · PCI-DSS compliant · We never see or store your card details.
          </p>
        </section>
      </main>
    </div>
  );
};
