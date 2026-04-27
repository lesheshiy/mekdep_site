import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', timeout = 3500) => {
      const id = ++counter;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => remove(id), timeout);
    },
    [remove]
  );

  const api = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error', 5000),
    info: (m) => push(m, 'info'),
    warn: (m) => push(m, 'warn'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-toast-in flex items-center gap-3 min-w-[260px] max-w-md ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : t.type === 'error'
                  ? 'bg-rose-600 text-white'
                  : t.type === 'warn'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800 text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {t.type === 'success'
                ? 'check_circle'
                : t.type === 'error'
                  ? 'error'
                  : t.type === 'warn'
                    ? 'warning'
                    : 'info'}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              className="opacity-70 hover:opacity-100"
              onClick={() => remove(t.id)}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const v = useContext(ToastContext);
  if (!v)
    return {
      success: console.log,
      error: console.error,
      info: console.log,
      warn: console.warn,
    };
  return v;
};
