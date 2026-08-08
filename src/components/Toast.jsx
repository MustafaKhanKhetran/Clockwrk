import { useCallback, useEffect, useState } from 'react';

let addToastFn = null;

export const toast = {
  success: (msg) => addToastFn?.({ type: 'success', msg }),
  error: (msg) => addToastFn?.({ type: 'error', msg }),
  info: (msg) => addToastFn?.({ type: 'info', msg }),
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((t) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    addToastFn = add;
    return () => { addToastFn = null; };
  }, [add]);

  if (!toasts.length) return null;

  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '×' : 'i'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
