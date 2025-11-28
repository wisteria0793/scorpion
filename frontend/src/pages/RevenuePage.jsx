// src/pages/RevenuePage.jsx
import React, { useState, useEffect } from 'react';
import { fetchRevenueData, fetchProperties } from '../services/revenueApi';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './RevenuePage.css';

function RevenuePage() {
    const [revenueData, setRevenueData] = useState([]);
    const [availableProperties, setAvailableProperties] = useState([]); // 新しく利用可能な施設名を保持するstate
    const [availableYears, setAvailableYears] = useState([]); // 新しく利用可能な年度を保持するstate
    const [filters, setFilters] = useState(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        return {
            startDate: `${currentYear}-01-01`,
            endDate: today.toISOString().split('T')[0],
            groupBy: 'month', // 'month', 'year', 'facility'
            selectedProperty: '', // 追加: 選択された施設名
            selectedYear: currentYear, // 追加: 選択された年度
        };
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 施設リストと年度リストの動的な生成
    useEffect(() => {
        if (revenueData && revenueData.length > 0) {
            const properties = new Set();
            const years = new Set();
            // raw_dataは {facility_name: {year: {month: revenue}}} 形式
            // しかし、revenueDataは_format_data後の配列形式
            // なので、_format_data後のデータから施設名と年度を抽出する
            revenueData.forEach(item => {
                if (item.name) { // facilityの場合
                    properties.add(item.name);
                }
                if (item.year) { // yearの場合
                    years.add(item.year);
                }
                if (item.date) { // monthの場合 (dateは 'YYYY-MM' 形式)
                    years.add(parseInt(item.date.split('-')[0]));
                }
            });
            setAvailableProperties(Array.from(properties).sort());
            setAvailableYears(Array.from(years).sort((a, b) => b - a)); // 新しい順
        }
        // fetchProperties() は不要になったため削除
    }, [revenueData]);

    // 売上データの取得
    const loadRevenueData = async () => {
        setLoading(true);
        setError(null);
        try {
            let actualGroupBy = filters.groupBy;
            let actualStartDate = filters.startDate;
            let actualEndDate = filters.endDate;
            let propertyNameParam = filters.selectedProperty;
            let yearParam = filters.selectedYear;

            // 「年別」表示時に施設が選択された場合、その施設の当該年度の月別データに切り替える
            if (filters.groupBy === 'year' && filters.selectedProperty) {
                actualGroupBy = 'month'; // 施設別フィルターが適用されたら月別に強制
                // 選択された年度の1月1日から12月31日
                actualStartDate = `${filters.selectedYear}-01-01`;
                actualEndDate = `${filters.selectedYear}-12-31`;
                yearParam = filters.selectedYear; // バックエンドでフィルタリングするために渡す
                propertyNameParam = filters.selectedProperty;
            } else if (filters.groupBy === 'year') {
                // 年別表示で施設が選択されていない場合、当該年度の1月1日から12月31日
                actualStartDate = `${filters.selectedYear}-01-01`;
                actualEndDate = `${filters.selectedYear}-12-31`;
                yearParam = filters.selectedYear;
            }


            const params = {
                start_date: actualStartDate,
                end_date: actualEndDate,
                group_by: actualGroupBy,
                property_name: propertyNameParam, // 追加
                year: yearParam, // 追加
            };
            const data = await fetchRevenueData(params);
            setRevenueData(data);
        } catch (err) {
            setError('売上データの取得に失敗しました。');
            console.error(err); // 詳細なエラーをコンソールに出力
        } finally {
            setLoading(false);
        }
    };

    // フィルター変更時にデータを再取得
    useEffect(() => {
        loadRevenueData();
    }, [filters.groupBy, filters.selectedProperty, filters.selectedYear]); // groupByの変更時のみ自動で再取得

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
                    <label htmlFor="selectedYear">年度:</label>
                    <select
                        id="selectedYear"
                        name="selectedYear"
                        value={filters.selectedYear}
                        onChange={(e) => setFilters(prev => ({ ...prev, selectedYear: parseInt(e.target.value) }))}
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}年</option>
                        ))}
                    </select>
                </div>

                {/* 年別表示かつ施設選択トグルがオンの場合のみ施設選択ドロップダウンを表示 */}
                {filters.groupBy === 'year' && (
                    <div className="filter-group">
                        <label htmlFor="selectedProperty">施設:</label>
                        <select
                            id="selectedProperty"
                            name="selectedProperty"
                            value={filters.selectedProperty}
                            onChange={(e) => setFilters(prev => ({ ...prev, selectedProperty: e.target.value }))}
                        >
                            <option value="">全施設</option>
                            {availableProperties.map(propName => (
                                <option key={propName} value={propName}>{propName}</option>
                            ))}
                        </select>
                    </div>
                )}


                <div className="filter-group">
                    <label htmlFor="startDate">開始日:</label>
                    <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="endDate">終了日:</label>
                    <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
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
