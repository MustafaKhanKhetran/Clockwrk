import { useEffect, useState } from 'react';
import Icon from './Icon';
import { api } from './api';
import { Action } from './Primitives';

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const asDate = (d) => d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function Copyable({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return <div className="v3-bank-row">
    <span>{label}</span>
    <strong>{value}</strong>
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      aria-label={`Copy ${label}`}
    >{copied ? <Icon name="check" size={14} /> : <Icon name="files" size={14} />}</button>
  </div>;
}

/**
 * The waiting room between "I want this" and "this is active".
 *
 * Shows exactly what is pending, what it costs, where to send it and the
 * reference that lets the team match the transfer. Reporting the transfer also
 * stops the 7-day expiry clock server-side, so a slow international payment can
 * never be cancelled underneath the client.
 */
export default function PendingChange({ change, onChanged }) {
  const [payment, setPayment] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const needsPayment = ['awaiting_payment', 'partially_paid'].includes(change.status);

  useEffect(() => {
    if (!needsPayment && change.status !== 'payment_reported') return;
    api.paymentDetails().then(({ payment: p }) => setPayment(p)).catch(() => {});
  }, [needsPayment, change.status]);

  const run = async (label, fn) => {
    setBusy(label);
    setError('');
    try { await fn(); await onChanged?.(); } catch (err) { setError(err.message || 'Something went wrong.'); } finally { setBusy(''); }
  };

  const outstanding = Number(change.amount_due) - Number(change.amount_received || 0);

  const title = change.kind === 'addon'
    ? `${change.direction === 'remove' ? 'Removing' : 'Adding'} ${change.to_value.replace(/_/g, ' ')}`
    : `${change.direction === 'downgrade' ? 'Moving down to' : 'Upgrading to'} ${change.to_value}`;

  return <section className={`v3-pending-change is-${change.status}`}>
    <header>
      <span className="v3-pending-mark"><Icon name={change.status === 'scheduled' ? 'calendar' : 'clock'} size={18} /></span>
      <div>
        <small>
          {change.status === 'awaiting_payment' && 'Awaiting your transfer'}
          {change.status === 'payment_reported' && 'Transfer reported — being verified'}
          {change.status === 'partially_paid' && 'Part payment received'}
          {change.status === 'scheduled' && 'Scheduled'}
        </small>
        <strong>{title}</strong>
        <p>
          {change.status === 'scheduled'
            ? <>Takes effect on {asDate(change.effective_date)}. Nothing changes before then.</>
            : change.status === 'payment_reported'
              ? <>We are checking for your transfer. Your plan updates as soon as it lands — usually within one business day.</>
              : change.status === 'partially_paid'
                ? <>We received {money(change.amount_received)} of {money(change.amount_due)}. Send the remaining <strong>{money(outstanding)}</strong> to activate.</>
                : <>This activates once your transfer is received and verified. Your current plan is unchanged until then.</>}
        </p>
      </div>
      {needsPayment && <b>{money(outstanding)}</b>}
    </header>

    {(needsPayment || change.status === 'payment_reported') && payment && (
      <div className="v3-bank-block">
        <span className="v3-bank-title">Transfer details <em>{payment.currency}</em></span>
        <Copyable label="Beneficiary" value={payment.beneficiary} />
        <Copyable label="Bank" value={payment.bankName} />
        <Copyable label="Account number" value={payment.accountNumber} />
        <Copyable label="Routing (ACH / ABA)" value={payment.routingNumber} />
        <Copyable label="Reference" value={change.payment_ref} />
        <p className="v3-bank-note">
          <Icon name="help" size={14} />
          Put the reference <strong>{change.payment_ref}</strong> on the transfer so we can match it to your account.
        </p>
      </div>
    )}

    {error && <p className="v3-chat-note is-error">{error}</p>}

    <footer>
      {needsPayment && (
        <Action icon="check" disabled={!!busy} onClick={() => run('report', () => api.reportTransfer(change.id))}>
          {busy === 'report' ? 'Saving…' : "I've sent the transfer"}
        </Action>
      )}
      {change.status !== 'payment_reported' && (
        <button type="button" disabled={!!busy} onClick={() => run('cancel', () => api.cancelBillingChange(change.id))}>
          {busy === 'cancel' ? 'Cancelling…' : 'Cancel this change'}
        </button>
      )}
      {change.status === 'awaiting_payment' && change.expires_at && (
        <small>Held until {asDate(change.expires_at)}. Telling us you have sent it stops the clock.</small>
      )}
    </footer>
  </section>;
}
