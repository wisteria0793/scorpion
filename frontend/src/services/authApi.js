import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // allow cookies (session-based auth)
});

export const register = ({ username, email, password, password2 }) => {
  return apiClient.post('/auth/register/', { username, email, password, password2 });
};

export const login = ({ username, password }) => {
  return apiClient.post('/auth/login/', { username, password });
};

export const logout = () => {
  return apiClient.post('/auth/logout/');
};

export const me = () => {
  return apiClient.get('/auth/me/');
};
