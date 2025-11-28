// src/pages/RevenuePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { fetchRevenueData } from '../services/revenueApi';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './RevenuePage.css';

function RevenuePage() {
    const [monthlyData, setMonthlyData] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [availableProperties, setAvailableProperties] = useState([]); // 施設リストを永続的に保持
    
    const getCurrentFiscalYear = () => {
        const today = new Date();
        return today.getMonth() < 2 ? today.getFullYear() - 1 : today.getFullYear();
    };

    const [selectedYear, setSelectedYear] = useState(getCurrentFiscalYear);
    const [selectedProperty, setSelectedProperty] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 初期化処理: 利用可能な年度と施設のリストを取得
    useEffect(() => {
        const currentYear = getCurrentFiscalYear();
        setAvailableYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);

        const fetchInitialData = async () => {
            try {
                // 全施設のデータを一度取得して、そこから施設リストを生成
                const initialData = await fetchRevenueData({ year: currentYear, property_name: '' });
                const keys = new Set();
                initialData.forEach(month => {
                    Object.keys(month).forEach(key => {
                        if (key !== 'date' && key !== 'name' && key !== 'total' && key !== 'revenue') {
                            keys.add(key);
                        }
                    });
                });
                setAvailableProperties(Array.from(keys).sort());
            } catch (err) {
                console.error("Failed to fetch initial property list", err);
                setError('施設リストの取得に失敗しました。');
            }
        };

        fetchInitialData();
    }, []);

    // フィルター変更時に表示用データを再取得
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    year: selectedYear,
                    property_name: selectedProperty,
                };
                const data = await fetchRevenueData(params);
                setMonthlyData(data);
            } catch (err) {
                setError('売上データの取得に失敗しました。');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (selectedYear) {
            loadData();
        }
    }, [selectedYear, selectedProperty]);

    // グラフ用にデータを整形・ソート
    const chartData = useMemo(() => {
        if (!monthlyData || monthlyData.length === 0) return [];
        
        const sorted = [...monthlyData].sort((a, b) => {
            const monthA = parseInt(a.date.split('-')[1]);
            const monthB = parseInt(b.date.split('-')[1]);
            const sortOrderA = monthA < 3 ? monthA + 12 : monthA;
            const sortOrderB = monthB < 3 ? monthB + 12 : monthB;
            return sortOrderA - sortOrderB;
        });

        return sorted.map(item => ({
            ...item,
            name: `${parseInt(item.date.split('-')[1])}月`,
        }));
    }, [monthlyData]);

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57', '#ffc658'];

    return (
        <div className="revenue-page">
            <h1>月別 売上レポート</h1>
            
            <div className="filters">
                <div className="filter-group">
                    <label htmlFor="selectedYear">会計年度:</label>
                    <select
                        id="selectedYear"
                        name="selectedYear"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}年度</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="selectedProperty">施設:</label>
                    <select
                        id="selectedProperty"
                        name="selectedProperty"
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
                    >
                        <option value="">全施設</option>
                        {availableProperties.map(propName => (
                            <option key={propName} value={propName}>{propName}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="data-display">
                {loading && <p>読み込み中...</p>}
                {error && <p className="error">{error}</p>}
                {!loading && !error && chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" tickFormatter={(value) => `¥${(value / 10000).toLocaleString()}万`} />
                            <Tooltip formatter={(value, name) => [`¥${value.toLocaleString()}`, name]} />
                            <Legend />
                            
                            {selectedProperty === '' ? (
                                <>
                                    {availableProperties.map((propName, index) => (
                                        <Bar 
                                            key={propName} 
                                            yAxisId="left"
                                            dataKey={propName} 
                                            stackId="a" 
                                            fill={COLORS[index % COLORS.length]} 
                                        />
                                    ))}
                                    <Line 
                                        type="monotone" 
                                        yAxisId="left"
                                        dataKey="total" 
                                        name="総売上" 
                                        stroke="#ff7300" 
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </>
                            ) : (
                                <Bar yAxisId="left" dataKey="revenue" name="売上" fill="#8884d8" />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
                {!loading && !error && chartData.length === 0 && (
                    <p>表示するデータがありません。</p>
                )}
            </div>
        </div>
    );
}

export default RevenuePage;
