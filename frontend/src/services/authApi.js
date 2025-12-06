import apiClient, { apiBaseURL } from './apiClient';

const getCookie = (name) => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return match ? match.pop() : '';
};

const ensureCsrf = async () => {
  const existing = getCookie('csrftoken');
  if (existing) return existing;
  await fetch(`${apiBaseURL}/accounts/csrf/`, { credentials: 'include' });
  return getCookie('csrftoken');
};

export const register = async ({ username, email, password, password2 }) => {
  const token = await ensureCsrf();
  const headers = token ? { 'X-CSRFToken': token } : {};
  return apiClient.post('/accounts/register/', { username, email, password, password2 }, { headers });
};

export const login = async ({ username, password }) => {
  const token = await ensureCsrf();
  const headers = token ? { 'X-CSRFToken': token } : {};
  return apiClient.post('/accounts/login/', { username, password }, { headers });
};

export const me = () => apiClient.get('/accounts/me/');

export const logout = () => {
  return (async () => {
    const token = await ensureCsrf();
    const headers = token ? { 'X-CSRFToken': token } : {};
    try {
      return await apiClient.post('/accounts/logout/', {}, { headers });
    } catch (err) {
      if (err?.response?.status === 403) {
        const token2 = await ensureCsrf();
        const headers2 = token2 ? { 'X-CSRFToken': token2 } : {};
        return apiClient.post('/accounts/logout/', {}, { headers: headers2 });
      }
      throw err;
    }
  })();
};

