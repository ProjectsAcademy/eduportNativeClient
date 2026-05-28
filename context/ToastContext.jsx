import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast } from '../components/ui/Toast';

const ToastContext = createContext(null);

let _nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++_nextId;

    setToasts(prev => {
      // Max 3 visible at once — drop the oldest if over limit
      const trimmed = prev.length >= 3 ? prev.slice(1) : prev;
      return [...trimmed, { id, message, type }];
    });

    timers.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timers.current[id];
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Render toasts above everything — pointerEvents box-none so taps pass through */}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 200,
  },
});
