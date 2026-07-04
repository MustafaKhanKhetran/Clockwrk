export default function Select({ label, value, onChange, options, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-sm font-medium text-primary">{label}</span>}
      <span className="relative block">
        <select
          value={value}
          onChange={onChange}
          className="w-full appearance-none rounded-lg border border-border bg-white px-3 py-2 pr-9 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          {...props}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 9-7 7-7-7" />
        </svg>
      </span>
    </label>
  );
}
