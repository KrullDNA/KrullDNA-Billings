import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    const duration = type === 'error' ? 6000 : 3000;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (type !== 'error') {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[999] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${t.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            <span className="flex-1">{t.message}</span>
            {t.type === 'error' && (
              <button onClick={() => removeToast(t.id)} className="text-white/70 hover:text-white">&times;</button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
