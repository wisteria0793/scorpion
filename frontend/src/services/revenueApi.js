// src/services/revenueApi.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api'; // Djangoサーバーのアドレス

// axiosのインスタンスを作成
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CORSでCookieを送信するために必要
});

/**
 * 売上データをバックエンドから取得する
 * @param {object} params - クエリパラメータ
 * @param {string} params.start_date - 開始日 (YYYY-MM-DD)
 * @param {string} params.end_date - 終了日 (YYYY-MM-DD)
 * @param {string} params.group_by - 集計単位 ('facility', 'year', 'month')
 * @returns {Promise<Array>} - 集計された売上データの配列
 */
export const fetchRevenueData = async (params) => {
  try {
    const response = await apiClient.get('/revenue/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    // エラーオブジェクトをそのまま投げることで、呼び出し元で詳細なハンドリングが可能
    throw error;
  }
};

/**
 * 前年同月比の売上データをバックエンドから取得する
 * @param {object} params - クエリパラメータ (year, property_name)
 * @returns {Promise<Array>}
 */
export const fetchYoYRevenueData = async (params) => {
  try {
    const response = await apiClient.get('/revenue/yoy/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching YoY revenue data:', error);
    throw error;
  }
};

/**
 * 国籍別比率データをバックエンドから取得する
 * @param {object} params - クエリパラメータ (year, property_name)
 * @returns {Promise<Array>}
 */
export const fetchNationalityData = async (params) => {
  try {
    const response = await apiClient.get('/analytics/nationality/', { params });
    return response.data;
  } catch (error)
{
    console.error('Error fetching nationality data:', error);
    throw error;
  }
};


/**
 * 施設のリストをバックエンドから取得する
 * （補足: このAPIはまだ実装していませんが、施設ごとのフィルタリングに必要になります）
 * @returns {Promise<Array>} - 施設データの配列
 */
export const fetchProperties = async () => {
    try {
        // 仮実装: 将来的に /api/properties/ のようなエンドポイントを想定
        // const response = await apiClient.get('/properties/');
        // return response.data;
        
        // 現時点ではモックデータを返す
        console.warn('fetchProperties is using mock data. Implement the backend endpoint.');
        return [
            { id: 1, name: '巴.com' },
            { id: 2, name: 'ONE PIECE HOUSE' },
            { id: 3, name: '巴.com 3' },
        ];
    } catch (error) {
        console.error('Error fetching properties:', error);
        throw error;
    }
}

/**
 * 最終同期時刻をバックエンドから取得する
 * @returns {Promise<object>} - 最終同期時刻を含むオブジェクト
 */
export const getLastSyncTime = async () => {
  try {
    const response = await apiClient.get('/sync-status/');
    return response.data;
  } catch (error) {
    console.error('Error fetching last sync time:', error);
    throw error;
  }
};