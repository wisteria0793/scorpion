import apiClient from './apiClient';

export const register = ({ username, email, password, password2 }) =>
  apiClient.post('/auth/register/', { username, email, password, password2 });

export const login = ({ username, password }) =>
  apiClient.post('/auth/login/', { username, password });

export const me = () => apiClient.get('/auth/me/');

export const logout = () => {
  // Ensure CSRF cookie is present and send header. If missing, fetch /auth/csrf/ first.
  const getCookie = (name) => {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return match ? match.pop() : '';
  };

  const ensureCsrf = async () => {
    const token = getCookie('csrftoken');
    if (token) return token;
    // fetch endpoint to set cookie (credentials required)
    await fetch('http://localhost:8000/api/auth/csrf/', { credentials: 'include' });
    return getCookie('csrftoken');
  };

  return (async () => {
    const token = await ensureCsrf();
    const headers = token ? { 'X-CSRFToken': token } : {};
    try {
      return await apiClient.post('/auth/logout/', {}, { headers });
    } catch (err) {
      // If the first attempt failed due to CSRF, refresh token and retry once
      if (err?.response?.status === 403) {
        const token2 = await ensureCsrf();
        const headers2 = token2 ? { 'X-CSRFToken': token2 } : {};
        return apiClient.post('/auth/logout/', {}, { headers: headers2 });
      }
      throw err;
    }
  })();
};

