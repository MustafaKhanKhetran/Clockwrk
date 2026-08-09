import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DetailPage({ eyebrow, title, subtitle, meta, actions, children }) {
  const navigate = useNavigate();
  return <div className="detail-page">
    <button className="back-link" type="button" onClick={() => navigate(-1)}><ArrowLeft size={17} /> Back</button>
    <header className="detail-page-header">
      <div>
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {meta && <div className="detail-meta">{meta}</div>}
      </div>
      {actions && <div className="detail-actions">{actions}</div>}
    </header>
    {children}
  </div>;
}

export function DetailSection({ title, description, action, children, className='' }) {
  return <section className={`detail-section ${className}`}>
    <header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>
    {children}
  </section>;
}

export function LoadingDetail() { return <div className="detail-loading"><span />Loading record...</div>; }
export function ErrorDetail({ message, onRetry }) { return <div className="detail-error"><strong>Could not load this record.</strong><p>{message}</p>{onRetry && <button className="btn btn-primary" onClick={onRetry}>Try again</button>}</div>; }

export const formatDate = value => value ? new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Not set';
export const humanize = value => String(value || 'Not set').replaceAll('_',' ');
