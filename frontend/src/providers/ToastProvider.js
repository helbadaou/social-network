"use client";
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";

const ToastContext = createContext(null);

export const TOAST_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(
    (message, type = TOAST_TYPES.INFO, duration = 3000) => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message, duration) => {
      return addToast(message, TOAST_TYPES.SUCCESS, duration);
    },
    [addToast]
  );

  const error = useCallback(
    (message, duration) => {
      return addToast(message, TOAST_TYPES.ERROR, duration);
    },
    [addToast]
  );

  const info = useCallback(
    (message, duration) => {
      return addToast(message, TOAST_TYPES.INFO, duration);
    },
    [addToast]
  );

  const warning = useCallback(
    (message, duration) => {
      return addToast(message, TOAST_TYPES.WARNING, duration);
    },
    [addToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
    clearAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  }, [onRemove, toast.id]);

  useEffect(() => {
    if (toast.duration) {
      const timeout = setTimeout(() => {
        handleRemove();
      }, toast.duration);

      return () => clearTimeout(timeout);
    }
  }, [toast.duration, handleRemove]);

  return (
    <div
      className={`toast toast-${toast.type} ${isRemoving ? "removing" : ""}`}
    >
      <div className="toast-content">{toast.message}</div>
      <button className="toast-close" onClick={handleRemove}>
        ×
      </button>
    </div>
  );
}
