import { useEffect, useRef, useState } from 'react';

const formatLabel = (value) => String(value || '')
  .replace(/[-_]/g, ' ')
  .replace(/\b\w/g, c => c.toUpperCase());

export default function PillSelect({ value, options, onChange, className = '', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const normalized = options.map(option => (
    typeof option === 'string' ? { value: option, label: formatLabel(option) } : option
  ));
  const selected = normalized.find(option => option.value === value) || normalized[0];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className={`pill-select ${open ? 'is-open' : ''} ${className}`} ref={ref}>
      <button
        className="pill-select-trigger"
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        <span>{selected?.label}</span>
        <span className="pill-select-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </button>

      <div className="pill-select-menu" role="listbox">
        {normalized.map(option => (
          <button
            key={option.value}
            className={`pill-select-option ${option.value === value ? 'is-selected' : ''}`}
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={() => handleSelect(option.value)}
          >
            <span>{option.label}</span>
            {option.value === value && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
