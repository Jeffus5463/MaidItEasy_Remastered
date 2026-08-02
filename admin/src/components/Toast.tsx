'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { TickIcon } from './icons';

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <div
          style={{
            position: 'fixed',
            bottom: 26,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 90,
            background: '#0b2b28',
            color: '#fff',
            padding: '13px 20px',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            boxShadow: '0 16px 40px -12px rgba(11,43,40,.6)',
            animation: 'toastIn .3s cubic-bezier(.2,.9,.3,1) both',
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#0e6e63',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              animation: 'pop .4s both',
            }}
          >
            <TickIcon size={14} color="#fff" />
          </span>
          <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{message}</span>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
