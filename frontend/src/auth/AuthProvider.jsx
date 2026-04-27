import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const { data } = await api.get('/auth/me/');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('access')) loadMe();
    else setLoading(false);
  }, []);

  const login = async (username, password, remember = true) => {
    const { data } = await api.post('/auth/login/', { username, password });
    const store = remember ? localStorage : sessionStorage;
    store.setItem('access', data.access);
    store.setItem('refresh', data.refresh);
    if (!remember) {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
    }
    // The api interceptor reads from localStorage; mirror tokens for compatibility
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    await loadMe();
  };

  const register = async (payload) => {
    await api.post('/auth/register/', payload);
    await login(payload.username, payload.password);
  };

  const refreshMe = () => loadMe();

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    sessionStorage.removeItem('access');
    sessionStorage.removeItem('refresh');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
