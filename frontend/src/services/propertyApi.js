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

// Image functions
export const getImages = (propertyId) => {
  return apiClient.get(`/properties/${propertyId}/images/`);
};

export const uploadImage = (propertyId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  return apiClient.post(`/properties/${propertyId}/images/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteImage = (propertyId, imageId) => {
  return apiClient.delete(`/properties/${propertyId}/images/${imageId}/`);
};
