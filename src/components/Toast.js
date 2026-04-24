import React, { useState, useCallback } from 'react';

let _addToast = null;

export function toast(message, type = 'error') {
  _addToast?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  _addToast = useCallback((message, type) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span className="toast-icon">{t.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
