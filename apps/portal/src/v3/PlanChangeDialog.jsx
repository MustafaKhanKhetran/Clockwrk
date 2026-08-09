import { useEffect, useState } from 'react';
import Icon from './Icon';
import { api } from './api';
import { Action } from './Primitives';

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const asDate = (d) => d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/**
 * Lets the client choose HOW to pay for an upgrade or add-on rather than
 * deciding for them. All three amounts come from the API so the numbers shown
 * are the numbers charged.
 *
 * Downgrades and removals skip the picker entirely — they cost nothing and are
 * simply scheduled for the end of the current period.
 */
export default function PlanChangeDialog({ kind, target, label, currentCadence = 'weekly', onClose, onDone }) {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('prorate_now');
  const [cadence, setCadence] = useState(currentCadence);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setData(null);
    api.billingQuote(kind, target, 1, kind === 'plan' ? cadence : undefined)
      .then((res) => {
        setData(res);
        if (!res.downgrade && !res.cadenceChange) setMode(res.options[0].mode);
      })
      .catch((err) => setError(err.message || 'Could not price that change.'))
      .finally(() => setLoading(false));
  }, [cadence, kind, target]);

  const confirm = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.requestBillingChange({
        kind,
        target,
        cadence: kind === 'plan' ? cadence : undefined,
        mode: (data?.downgrade || data?.cadenceChange) ? 'at_renewal' : mode,
      });
      onDone?.(res);
    } catch (err) {
      setError(err.message || 'Could not submit that change.');
      setSaving(false);
    }
  };

  return <div className="v3-dialog-layer" onMouseDown={onClose}>
    <section className="v3-change-dialog" onMouseDown={(event) => event.stopPropagation()}>
      <header><span>Change your plan</span><button onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button></header>

      {loading && <p className="v3-chat-note">Pricing your options…</p>}
      {error && <p className="v3-chat-note is-error">{error}</p>}

      {kind === 'plan' && <div className="v3-change-cadence">
        <span>Billing cadence</span>
        <div role="radiogroup" aria-label="Billing cadence" data-cadence={cadence}>
          <i aria-hidden="true" />
          {['weekly', 'monthly'].map((option) => <button
            key={option}
            type="button"
            role="radio"
            aria-checked={cadence === option}
            className={cadence === option ? 'is-active' : ''}
            onClick={() => setCadence(option)}
          >{option === 'weekly' ? 'Weekly' : 'Monthly'}</button>)}
        </div>
      </div>}

      {data && <div key={`${cadence}-${data.targetPrice || data.newPrice}`} className="v3-quote-transition">
      {data.cadenceChange && <>
        <h2>Switch to {data.target} billing</h2>
        <p>Your current plan remains paid through <strong>{asDate(data.effectiveDate)}</strong>. Billing switches to <strong>{data.target}</strong> on that date at <strong>{money(data.newPrice)}{data.target === 'monthly' ? '/month' : '/week'}</strong>, and the following renewal moves to <strong>{asDate(data.followingBillingDate)}</strong>. Nothing to pay now.</p>
        <Action icon="check" onClick={confirm} disabled={saving}>{saving ? 'Scheduling…' : `Switch from ${asDate(data.effectiveDate)}`}</Action>
      </>}

      {data.downgrade && <>
        <h2>Move to {label}</h2>
        <p>This takes effect on <strong>{asDate(data.effectiveDate)}</strong>, at the end of your current paid period. Your new rate will be <strong>{money(data.newPrice)}{cadence === 'monthly' ? '/month' : '/week'}</strong>, with the following renewal on <strong>{asDate(data.followingBillingDate)}</strong>. Nothing to pay now.</p>
        {data.newSlots < data.currentSlots && (
          <div className="v3-change-warning">
            <Icon name="help" size={18} />
            <span>You will go from <strong>{data.currentSlots}</strong> parallel {data.currentSlots === 1 ? 'slot' : 'slots'} to <strong>{data.newSlots}</strong>. Any work over that limit moves back to the front of your queue rather than being lost.</span>
          </div>
        )}
        <Action icon="check" onClick={confirm} disabled={saving}>{saving ? 'Scheduling…' : `Schedule for ${asDate(data.effectiveDate)}`}</Action>
      </>}

      {!data.downgrade && !data.cadenceChange && <>
        <h2>Move to {label}</h2>
        <p>{data.remaining} day{data.remaining === 1 ? '' : 's'} left in your current paid period through <strong>{asDate(data.options[0]?.nextBillingDate)}</strong>. The new plan renews <strong>{cadence}</strong> at <strong>{money(data.targetPrice)}{cadence === 'monthly' ? '/month' : '/week'}</strong>; the following renewal is <strong>{asDate(data.followingBillingDate)}</strong>.</p>

        <div className="v3-mode-list" role="radiogroup" aria-label="Payment option">
          {data.options.map((option) => (
            <button
              key={option.mode}
              role="radio"
              aria-checked={mode === option.mode}
              className={mode === option.mode ? 'is-active' : ''}
              onClick={() => setMode(option.mode)}
            >
              <i />
              <div>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
                <em>Then {money(option.nextBillingAmount)} on {asDate(option.nextBillingDate)}</em>
              </div>
              <b>{option.amountDue > 0 ? money(option.amountDue) : 'No payment'}</b>
            </button>
          ))}
        </div>

        {(() => {
          const chosen = data.options.find((o) => o.mode === mode);
          if (!chosen?.creditApplied) return null;
          return <p className="v3-credit-note"><Icon name="check" size={14} />{money(chosen.creditApplied)} credited for the part of your current plan you have not used.</p>;
        })()}

        <Action icon="arrow" onClick={confirm} disabled={saving}>
          {saving ? 'Submitting…' : mode === 'at_renewal' ? 'Schedule the change' : 'Continue to payment'}
        </Action>
        <small className="v3-dialog-foot">Nothing activates until your transfer is received and verified.</small>
      </>}
      </div>}
    </section>
  </div>;
}
