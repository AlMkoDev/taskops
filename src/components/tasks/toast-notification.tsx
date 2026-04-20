'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastNotification = {
  message: string;
  type: ToastType;
  duration?: number;
};

class ToastManager {
  private listeners: Set<(toasts: Toast[]) => void> = new Set();
  private toasts: Toast[] = [];

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  show({ message, type, duration = 3000 }: ToastNotification) {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toast: Toast = { id, message, type };
    
    this.toasts = [...this.toasts, toast];
    this.notify();

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration });
  }

  warning(message: string, duration?: number) {
    this.show({ message, type: 'warning', duration });
  }

  info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration });
  }
}

export const toastManager = new ToastManager();

// Hook for using toasts
export function useToast() {
  return toastManager;
}

// Component to render toasts
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className="reports-toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`reports-toast reports-toast-${toast.type}`}
          role="alert"
        >
          <span className="reports-toast-icon">{icons[toast.type]}</span>
          <span className="reports-toast-message">{toast.message}</span>
          <button
            type="button"
            className="reports-toast-close"
            onClick={() => toastManager.remove(toast.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
