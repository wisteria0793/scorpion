// src/services/pricingApi.js
/**
 * 施設の価格設定管理用 API サービス
 */

import apiClient from './apiClient';

/**
 * 月別の価格データを取得
 * @param {number} propertyId - 施設ID
 * @param {number} year - 年
 * @param {number} month - 月（1-12）
 * @returns {Promise<Object>} - {basicSettings, calendarData}
 */
export const fetchMonthlyPricing = async (propertyId, year, month) => {
  try {
    const response = await apiClient.get(`/pricing/${propertyId}/${year}/${month}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching pricing data:', error);
    throw error;
  }
};

/**
 * 月別の価格データを更新（複数日一括）
 * @param {number} propertyId - 施設ID
 * @param {number} year - 年
 * @param {number} month - 月（1-12）
 * @param {Array} updates - 更新するデータの配列
 *   各要素: {date: '2026-03-01', price: 10000, isBlackout: false, minNights: 1}
 * @returns {Promise<Object>}
 */
export const updateMonthlyPricing = async (propertyId, year, month, updates) => {
  try {
    const response = await apiClient.post(`/pricing/${propertyId}/${year}/${month}/`, {
      updates,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating pricing data:', error);
    throw error;
  }
};

/**
 * 個別の日付ルールを作成・更新
 * @param {Object} ruleData - ルールデータ
 *   {property, date, price, minNights, isBlackout, blackoutReason}
 * @returns {Promise<Object>}
 */
export const createOrUpdatePricingRule = async (ruleData) => {
  try {
    const response = await apiClient.post('/pricing-rules/', ruleData);
    return response.data;
  } catch (error) {
    console.error('Error creating/updating pricing rule:', error);
    throw error;
  }
};

/**
 * 日付ルールを削除
 * @param {number} ruleId - ルールID
 * @returns {Promise<void>}
 */
export const deletePricingRule = async (ruleId) => {
  try {
    await apiClient.delete(`/pricing-rules/${ruleId}/`);
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    throw error;
  }
};

/**
 * 基本設定を更新
 * @param {number} propertyId - 施設ID
 * @param {Object} settings - 設定データ
 *   {basePrice, baseGuests, adultExtraPrice, childExtraPrice, minNights}
 * @returns {Promise<Object>}
 */
export const updateBasicSettings = async (propertyId, settings) => {
  try {
    const response = await apiClient.patch(`/properties/${propertyId}/`, {
      base_price: settings.basePrice,
      base_guests: settings.baseGuests,
      adult_extra_price: settings.adultExtraPrice,
      child_extra_price: settings.childExtraPrice,
      min_nights: settings.minNights,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating basic settings:', error);
    throw error;
  }
};

/**
 * 日付範囲のルールを取得
 * @param {number} propertyId - 施設ID
 * @param {string} startDate - 開始日 (YYYY-MM-DD)
 * @param {string} endDate - 終了日 (YYYY-MM-DD)
 * @returns {Promise<Array>}
 */
export const fetchPricingRules = async (propertyId, startDate, endDate) => {
  try {
    const response = await apiClient.get('/pricing-rules/', {
      params: {
        property: propertyId,
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    throw error;
  }
};

/**
 * CSVファイルからデータをインポート
 * @param {number} propertyId - 施設ID
 * @param {File} file - CSVファイル
 * @returns {Promise<Object>}
 */
export const importPricingFromCSV = async (propertyId, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(
      `/pricing/${propertyId}/import/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error importing pricing data:', error);
    throw error;
  }
};

/**
 * CSVファイルとしてエクスポート
 * @param {number} propertyId - 施設ID
 * @param {string} startDate - 開始日 (YYYY-MM-DD)
 * @param {string} endDate - 終了日 (YYYY-MM-DD)
 */
export const exportPricingToCSV = (propertyId, startDate, endDate) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const url = `${baseUrl}/pricing/${propertyId}/export/?start_date=${startDate}&end_date=${endDate}`;
  window.open(url, '_blank');
};

/**
 * Beds24と同期
 * @param {number} propertyId - 施設ID
 * @param {string} syncType - 同期タイプ ('basic' | 'calendar' | 'all')
 * @returns {Promise<Object>}
 */
export const syncWithBeds24 = async (propertyId, syncType = 'basic') => {
  try {
    const response = await apiClient.post(`/pricing/${propertyId}/sync-beds24/`, {
      sync_type: syncType,
    });
    return response.data;
  } catch (error) {
    console.error('Error syncing with Beds24:', error);
    throw error;
  }
};
