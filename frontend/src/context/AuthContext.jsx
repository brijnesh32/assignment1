import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const persistSession = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { token, user: userData } = await authApi.login({ email, password });
      persistSession(token, userData);
      return true;
    } catch (err) {
      setAuthError(err.response?.data?.error || 'login failed');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (name, email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { token, user: userData } = await authApi.signup({ name, email, password });
      persistSession(token, userData);
      return true;
    } catch (err) {
      setAuthError(err.response?.data?.error || 'signup failed');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, authError, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
