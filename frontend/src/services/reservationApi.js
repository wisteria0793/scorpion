// src/services/reservationApi.js
import apiClient from './apiClient';

/**
 * 月別の予約リストをバックエンドから取得する
 * @param {object} params - クエリパラメータ (year, month, property_name)
 * @returns {Promise<Array>}
 */
export const fetchMonthlyReservations = async (params) => {
  try {
    const response = await apiClient.get('/reservations/monthly/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly reservations:', error);
    throw error;
  }
};
