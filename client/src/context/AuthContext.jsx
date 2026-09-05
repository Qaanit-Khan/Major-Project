import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('arb_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // Inactivity timer: 30 min
  useEffect(() => {
    if (!user) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
        window.location.href = '/admin/login?expired=1';
      }, 30 * 60 * 1000);
    };
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      ['mousemove', 'keydown', 'click', 'scroll'].forEach(e => window.removeEventListener(e, reset));
    };
  }, [user]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('arb_token', data.token);
      localStorage.setItem('arb_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('arb_token');
    localStorage.removeItem('arb_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
