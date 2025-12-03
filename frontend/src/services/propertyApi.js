// src/services/propertyApi.js
import apiClient from './apiClient';

export const getProperties = () => {
  return apiClient.get('/properties/');
};

export const createProperty = (property) => {
  return apiClient.post('/properties/', property);
};

export const updateProperty = (id, property) => {
  return apiClient.put(`/properties/${id}/`, property);
};

export const deleteProperty = (id) => {
  return apiClient.delete(`/properties/${id}/`);
};
