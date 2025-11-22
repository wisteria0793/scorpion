// frontend/src/pages/CheckInPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lookupReservation } from '../services/guestFormsApi';

export default function CheckInPage() {
  const { facilitySlug } = useParams();
  const navigate = useNavigate();
  const [checkInDate, setCheckInDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await lookupReservation(facilitySlug, checkInDate);
      const { token } = response.data;
      navigate(`/guest-form/${token}`);
    } catch (err) {
      setError('予約が見つかりませんでした。日付を確認して再度お試しください。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>ご予約の確認</h1>
      <p>チェックイン日を入力してください。</p>
      <form onSubmit={handleSubmit}>
        <input
          type="date"
          value={checkInDate}
          onChange={(e) => setCheckInDate(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? '検索中...' : '次へ'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
