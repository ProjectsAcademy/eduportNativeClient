import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../utils/storage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const deviceScheme = useColorScheme();
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'

  useEffect(() => {
    // Load persisted theme
    storage.getItem('theme').then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      } else {
        setTheme(deviceScheme === 'dark' ? 'dark' : 'light');
      }
    });
  }, [deviceScheme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    storage.setItem('theme', next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
