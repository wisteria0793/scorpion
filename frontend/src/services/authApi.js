import apiClient from './apiClient';

export const register = async ({ username, email, password, password2 }) => {
  return apiClient.post('/accounts/register/', { username, email, password, password2 });
};

export const login = async ({ username, password }) => {
  return apiClient.post('/accounts/login/', { username, password });
};

export const me = () => apiClient.get('/accounts/me/');

export const logout = () => {
  return apiClient.post('/accounts/logout/', {});
};

