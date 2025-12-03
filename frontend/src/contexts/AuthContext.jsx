import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../services/authApi';

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
    // ensure CSRF cookie exists then try to fetch current user when app loads
    async function loadUser() {
      try {
        // request CSRF cookie to be set by the server (must include credentials)
        try {
          await fetch('http://localhost:8000/api/auth/csrf/', { credentials: 'include' });
        } catch (e) {
          // ignore - csrf endpoint might fail in some envs
        }

        // set axios default header for CSRF using document cookie
        try {
          const match = document.cookie.match('(^|;)\\s*' + 'csrftoken' + '\\s*=\\s*([^;]+)');
          const csrf = match ? match.pop() : '';
          if (csrf) {
            // set default header for subsequent requests
            // eslint-disable-next-line global-require
            const apiClient = require('../services/authApi').default;
            apiClient.defaults.headers.common['X-CSRFToken'] = csrf;
          }
        } catch (e) {
          // ignore - may run in non-browser environments during tests
        }

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
    await authApi.logout();
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
