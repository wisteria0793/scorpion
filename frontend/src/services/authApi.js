import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const register = ({ username, email, password, password2 }) =>
  apiClient.post('/auth/register/', { username, email, password, password2 });

export const login = ({ username, password }) =>
  apiClient.post('/auth/login/', { username, password });

export const me = () => apiClient.get('/auth/me/');

export const logout = () => {
  // read csrftoken from document.cookie in the browser
  const getCookie = (name) => {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return match ? match.pop() : '';
  };

  const token = getCookie('csrftoken');
  return apiClient.post('/auth/logout/', {}, { headers: { 'X-CSRFToken': token } });
};

export default apiClient;
