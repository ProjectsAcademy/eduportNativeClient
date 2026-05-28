import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on boot
    Promise.all([
      storage.getItem('token'),
      storage.getObject('user'),
    ]).then(([savedToken, savedUser]) => {
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
      }
      setLoading(false);
    });
  }, []);

  const login = async (tokenVal, userData) => {
    await storage.setItem('token', tokenVal);
    await storage.setObject('user', userData);
    setToken(tokenVal);
    setUser(userData);
  };

  const updateUser = async (userData) => {
    const updated = { ...user, ...userData };
    await storage.setObject('user', updated);
    setUser(updated);
  };

  const logout = async () => {
    await storage.removeItem('token');
    await storage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
