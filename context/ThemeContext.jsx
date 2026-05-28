import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../utils/storage';

const ThemeContext = createContext(null);

export const ACCENT_COLORS = [
  { id: 'indigo', label: 'Indigo',  value: '#4F46E5' },
  { id: 'violet', label: 'Violet',  value: '#7C3AED' },
  { id: 'blue',   label: 'Blue',    value: '#3B82F6' },
  { id: 'green',  label: 'Green',   value: '#10B981' },
  { id: 'amber',  label: 'Amber',   value: '#F59E0B' },
  { id: 'rose',   label: 'Rose',    value: '#F43F5E' },
];

export const DENSITY_OPTIONS = [
  { id: 'compact',      label: 'Compact' },
  { id: 'default',      label: 'Default' },
  { id: 'comfortable',  label: 'Comfortable' },
];

export function ThemeProvider({ children }) {
  const deviceScheme = useColorScheme();
  const [theme, setTheme]           = useState('light');
  const [accentColor, setAccentColor] = useState('#4F46E5');
  const [density, setDensity]       = useState('default');

  useEffect(() => {
    Promise.all([
      storage.getItem('theme'),
      storage.getItem('accentColor'),
      storage.getItem('density'),
    ]).then(([savedTheme, savedAccent, savedDensity]) => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      } else {
        setTheme(deviceScheme === 'dark' ? 'dark' : 'light');
      }
      if (savedAccent) setAccentColor(savedAccent);
      if (savedDensity) setDensity(savedDensity);
    });
  }, [deviceScheme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    storage.setItem('theme', next);
  };

  const changeAccentColor = (color) => {
    setAccentColor(color);
    storage.setItem('accentColor', color);
  };

  const changeDensity = (d) => {
    setDensity(d);
    storage.setItem('density', d);
  };

  return (
    <ThemeContext.Provider value={{
      theme, toggleTheme, isDark: theme === 'dark',
      accentColor, changeAccentColor,
      density, changeDensity,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
