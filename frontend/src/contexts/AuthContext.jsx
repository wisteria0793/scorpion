import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../services/authApi';
import apiClient, { apiBaseURL } from '../services/apiClient'; // Import the shared apiClient

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to fetch current user when app loads
    async function loadUser() {
      try {
        const resp = await authApi.me();
        setUser(resp.data);
      } catch (err) {
        // not logged in
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async ({ username, password }) => {
    await authApi.login({ username, password });
    const resp = await authApi.me();
    setUser(resp.data);
    return resp.data;
  };

  const register = async (payload) => {
    return authApi.register(payload);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // ネットワークやCSRFエラー時もフロントの状態は確実にクリアする
      console.warn('logout request failed, clearing local state anyway', err);
    }
    setUser(null);
  };

  // persist user to localStorage so refresh has immediate state
  useEffect(() => {
    if (user) localStorage.setItem('currentUser', JSON.stringify(user));
    else localStorage.removeItem('currentUser');
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
