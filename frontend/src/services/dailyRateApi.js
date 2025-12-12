// src/services/dailyRateApi.js
import apiClient from './apiClient';

/**
 * 指定期間・施設の日別料金データを取得
 * @param {object} params - クエリパラメータ
 * @param {number} params.property_id - 施設ID
 * @param {string} params.start_date - 開始日 (YYYY-MM-DD)
 * @param {string} params.end_date - 終了日 (YYYY-MM-DD)
 * @returns {Promise<Array>} - 日別料金データの配列
 */
export const fetchDailyRates = async (params) => {
  try {
    const response = await apiClient.get('/daily-rates/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching daily rates:', error);
    throw error;
  }
};

/**
 * 特定の日付の料金を取得
 * @param {number} propertyId - 施設ID
 * @param {string} date - 日付 (YYYY-MM-DD)
 * @returns {Promise<object>} - 料金データ
 */
export const fetchRateByDate = async (propertyId, date) => {
  try {
    const response = await apiClient.get('/daily-rates/', {
      params: {
        property_id: propertyId,
        date: date
      }
    });
    return response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    console.error('Error fetching rate by date:', error);
    throw error;
  }
};

/**
 * 料金データを作成
 * @param {object} rateData - 料金データ
 * @returns {Promise<object>}
 */
export const createDailyRate = async (rateData) => {
  try {
    const response = await apiClient.post('/daily-rates/', rateData);
    return response.data;
  } catch (error) {
    console.error('Error creating daily rate:', error);
    throw error;
  }
};

/**
 * 料金データを更新
 * @param {number} id - 料金ID
 * @param {object} rateData - 更新する料金データ
 * @returns {Promise<object>}
 */
export const updateDailyRate = async (id, rateData) => {
  try {
    const response = await apiClient.patch(`/daily-rates/${id}/`, rateData);
    return response.data;
  } catch (error) {
    console.error('Error updating daily rate:', error);
    throw error;
  }
};

/**
 * 料金データを削除
 * @param {number} id - 料金ID
 * @returns {Promise<void>}
 */
export const deleteDailyRate = async (id) => {
  try {
    await apiClient.delete(`/daily-rates/${id}/`);
  } catch (error) {
    console.error('Error deleting daily rate:', error);
    throw error;
  }
};
