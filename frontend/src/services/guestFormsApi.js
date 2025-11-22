// frontend/src/services/guestFormsApi.js
import axios from 'axios';

// DjangoサーバーのベースURLを設定
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api', // 環境に応じて変更
  headers: {
    'Content-Type': 'application/json',
  },
});

export const lookupReservation = (facilitySlug, checkInDate) => {
  return apiClient.post(`/check-in/${facilitySlug}/`, {
    check_in_date: checkInDate,
  });
};

export const getFormDefinition = (token) => {
  return apiClient.get(`/guest-forms/${token}/`);
};

export const submitGuestForm = (token, formData) => {
  return apiClient.post(`/guest-forms/${token}/submit/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // ファイルアップロードのため
    },
  });
};
