import apiClient from './apiClient';

/**
 * 観光施設API
 */
export const tourismApi = {
  // 観光施設
  getAttractions: async (params = {}) => {
    const response = await apiClient.get('/tourism/attractions/', { params });
    return response.data;
  },

  getAttractionById: async (id) => {
    const response = await apiClient.get(`/tourism/attractions/${id}/`);
    return response.data;
  },

  getAttractionsByCategory: async (category) => {
    const response = await apiClient.get('/tourism/attractions/by_category/', {
      params: { category }
    });
    return response.data;
  },

  createAttraction: async (data) => {
    const response = await apiClient.post('/tourism/attractions/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateAttraction: async (id, data) => {
    const response = await apiClient.patch(`/tourism/attractions/${id}/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteAttraction: async (id) => {
    await apiClient.delete(`/tourism/attractions/${id}/`);
  },

  // イベント
  getEvents: async (params = {}) => {
    const response = await apiClient.get('/tourism/events/', { params });
    return response.data;
  },

  getEventById: async (id) => {
    const response = await apiClient.get(`/tourism/events/${id}/`);
    return response.data;
  },

  getUpcomingEvents: async () => {
    const response = await apiClient.get('/tourism/events/upcoming/');
    return response.data;
  },

  getEventsByDateRange: async (startDate, endDate) => {
    const response = await apiClient.get('/tourism/events/by_date_range/', {
      params: { start: startDate, end: endDate }
    });
    return response.data;
  },

  createEvent: async (data) => {
    const response = await apiClient.post('/tourism/events/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateEvent: async (id, data) => {
    const response = await apiClient.patch(`/tourism/events/${id}/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteEvent: async (id) => {
    await apiClient.delete(`/tourism/events/${id}/`);
  },

  // 季節のおすすめ
  getSeasonalRecommendations: async (params = {}) => {
    const response = await apiClient.get('/tourism/seasonal/', { params });
    return response.data;
  },

  getSeasonalRecommendationById: async (id) => {
    const response = await apiClient.get(`/tourism/seasonal/${id}/`);
    return response.data;
  },

  getCurrentSeasonRecommendations: async () => {
    const response = await apiClient.get('/tourism/seasonal/current_season/');
    return response.data;
  },

  createSeasonalRecommendation: async (data) => {
    const response = await apiClient.post('/tourism/seasonal/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateSeasonalRecommendation: async (id, data) => {
    const response = await apiClient.patch(`/tourism/seasonal/${id}/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteSeasonalRecommendation: async (id) => {
    await apiClient.delete(`/tourism/seasonal/${id}/`);
  },
};

export default tourismApi;
