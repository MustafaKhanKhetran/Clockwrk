export function Spinner() {
  return <div className="flex min-h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent" /></div>;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-danger/20 bg-danger/5 p-8 text-center">
      <p className="text-sm text-danger">{message || 'Something went wrong.'}</p>
      {onRetry && <button onClick={onRetry} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">Try again</button>}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="py-14 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background text-xl">○</div>
      <p className="font-medium text-primary">{title}</p>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
    </div>
  );
}
