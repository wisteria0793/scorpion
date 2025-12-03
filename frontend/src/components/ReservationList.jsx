// src/components/ReservationList.jsx
import React, { useState, useEffect } from 'react';
import { fetchMonthlyReservations } from '../services/reservationApi';
import './ReservationList.css';

function ReservationList() {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [availableYears, setAvailableYears] = useState([]);
    const [availableProperties, setAvailableProperties] = useState([]);

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedProperty, setSelectedProperty] = useState('');

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        setAvailableYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
        // This should ideally be fetched from an API
        setAvailableProperties(['ゲストハウス巴.com', 'ONE PIECE HOUSE', '巴.com3 Music&Stay', '巴.com4 Motomachi', '巴.com5 Cafe&Stay', '巴.com PremiumStay', 'mimosa', 'Iris']);
    }, []);

    useEffect(() => {
        const loadReservations = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    year: selectedYear,
                    month: selectedMonth,
                    property_name: selectedProperty,
                };
                const data = await fetchMonthlyReservations(params);
                setReservations(data);
            } catch (err) {
                setError('予約データの取得に失敗しました。');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadReservations();
    }, [selectedYear, selectedMonth, selectedProperty]);

    const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div className="reservation-list-container">
            <h1>月別 予約一覧</h1>
            <div className="filters">
                <div className="filter-group">
                    <label>年:</label>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                        {availableYears.map(year => <option key={year} value={year}>{year}年</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>月:</label>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                        {monthOptions.map(month => <option key={month} value={month}>{month}月</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>施設:</label>
                    <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}>
                        <option value="">全施設</option>
                        {availableProperties.map(propName => <option key={propName} value={propName}>{propName}</option>)}
                    </select>
                </div>
            </div>

            {loading && <p>読み込み中...</p>}
            {error && <p className="error">{error}</p>}
            {!loading && !error && (
                <div className="table-container">
                    <table className="reservation-table">
                        <thead>
                            <tr>
                                <th>チェックイン</th>
                                <th>予約者名</th>
                                <th>施設</th>
                                <th>泊数</th>
                                <th>人数</th>
                                <th>合計料金</th>
                                <th>ステータス</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservations.length > 0 ? (
                                reservations.map(res => (
                                    <tr key={res.id}>
                                        <td>{res.check_in_date}</td>
                                        <td>{res.guest_name}</td>
                                        <td>{res.property_name}</td>
                                        <td>{
                                            new Date(res.check_out_date) > new Date(res.check_in_date) ? 
                                            (new Date(res.check_out_date) - new Date(res.check_in_date)) / (1000 * 60 * 60 * 24) : 1
                                        }泊</td>
                                        <td>{res.num_guests}名</td>
                                        <td>¥{Number(res.total_price).toLocaleString()}</td>
                                        <td>{res.status}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center' }}>表示する予約がありません。</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ReservationList;
