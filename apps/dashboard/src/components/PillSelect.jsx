import { useEffect, useId, useRef, useState } from 'react';

const formatLabel = (value) => String(value || '')
  .replace(/[-_]/g, ' ')
  .replace(/\b\w/g, c => c.toUpperCase());

export default function PillSelect({ value, options, onChange, className = '', ariaLabel, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef(null);
  const optionRefs = useRef([]);
  const menuId = useId();
  const normalized = options.map(option => (
    typeof option === 'string' ? { value: option, label: formatLabel(option) } : option
  ));
  const selected = normalized.find(option => option.value === value) || normalized[0];
  const selectedIndex = Math.max(0, normalized.findIndex(option => option.value === selected?.value));

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex);
    requestAnimationFrame(() => optionRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' }));
  }, [open, selectedIndex]);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  const moveActive = (direction) => {
    setActiveIndex(current => {
      const next = (current + direction + normalized.length) % normalized.length;
      requestAnimationFrame(() => optionRefs.current[next]?.scrollIntoView({ block: 'nearest' }));
      return next;
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Home' && open) { event.preventDefault(); setActiveIndex(0); return; }
    if (event.key === 'End' && open) { event.preventDefault(); setActiveIndex(normalized.length - 1); return; }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      handleSelect(normalized[activeIndex].value);
    }
  };

  return (
    <div className={`pill-select ${open ? 'is-open' : ''} ${className}`} ref={ref}>
      <button
        className="pill-select-trigger"
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        onKeyDown={handleKeyDown}
      >
        <span>{selected?.label}</span>
        <span className="pill-select-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </button>

      <div className="pill-select-menu" id={menuId} role="listbox" aria-label={ariaLabel}>
        {normalized.map((option, index) => (
          <button
            key={option.value}
            ref={node => { optionRefs.current[index] = node; }}
            className={`pill-select-option ${option.value === value ? 'is-selected' : ''} ${index === activeIndex ? 'is-active' : ''}`}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={option.value === value}
            onPointerEnter={() => setActiveIndex(index)}
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
