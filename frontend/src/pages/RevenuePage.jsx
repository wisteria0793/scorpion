// src/pages/RevenuePage.jsx
import React, { useState, useEffect } from 'react';
import { fetchRevenueData, fetchProperties } from '../services/revenueApi';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './RevenuePage.css';

function RevenuePage() {
    const [revenueData, setRevenueData] = useState([]);
    const [properties, setProperties] = useState([]);
    const [filters, setFilters] = useState(() => {
        const today = new Date();
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        return {
            startDate: firstDayOfYear.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
            groupBy: 'month', // 'month', 'year', 'facility'
        };
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 施設リストの取得
    useEffect(() => {
        const loadProperties = async () => {
            try {
                const props = await fetchProperties();
                setProperties(props);
            } catch (err) {
                setError('施設の読み込みに失敗しました。');
            }
        };
        loadProperties();
    }, []);

    // 売上データの取得
    const loadRevenueData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                start_date: filters.startDate,
                end_date: filters.endDate,
                group_by: filters.groupBy,
            };
            const data = await fetchRevenueData(params);
            setRevenueData(data);
        } catch (err) {
            setError('売上データの取得に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    // フィルター変更時にデータを再取得
    useEffect(() => {
        loadRevenueData();
    }, [filters.groupBy]); // groupByの変更時のみ自動で再取得

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleGroupByChange = (newGroupBy) => {
        setFilters(prev => ({ ...prev, groupBy: newGroupBy }));
    };

    const renderChart = () => {
        if (!revenueData || revenueData.length === 0) {
            return <p>表示するデータがありません。</p>;
        }

        let chartData;
        let dataKey = "売上";

        switch (filters.groupBy) {
            case 'month':
                chartData = revenueData.map(item => ({ name: item.date, '売上': item.revenue }));
                break;
            case 'year':
                chartData = revenueData.map(item => ({ name: item.year, '売上': item.revenue }));
                break;
            case 'facility':
                dataKey = "総売上";
                chartData = revenueData.map(item => ({ name: item.name, '総売上': item.total_revenue }));
                break;
            default:
                return null;
        }

        return (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `¥${value.toLocaleString()}`} />
                    <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey={dataKey} fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    return (
        <div className="revenue-page">
            <h1>売上レポート</h1>
            
            <div className="filters">
                <div className="filter-group">
                    <label>集計単位:</label>
                    <div className="group-by-buttons">
                        <button onClick={() => handleGroupByChange('month')} className={filters.groupBy === 'month' ? 'active' : ''}>月別</button>
                        <button onClick={() => handleGroupByChange('year')} className={filters.groupBy === 'year' ? 'active' : ''}>年別</button>
                        <button onClick={() => handleGroupByChange('facility')} className={filters.groupBy === 'facility' ? 'active' : ''}>施設別</button>
                    </div>
                </div>

                <div className="filter-group">
                    <label htmlFor="startDate">開始日:</label>
                    <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="endDate">終了日:</label>
                    <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                    />
                </div>

                <button onClick={loadRevenueData} disabled={loading} className="apply-button">
                    期間適用
                </button>
            </div>

            <div className="data-display">
                {loading && <p>読み込み中...</p>}
                {error && <p className="error">{error}</p>}
                {!loading && !error && renderChart()}
            </div>
        </div>
    );
}

export default RevenuePage;
