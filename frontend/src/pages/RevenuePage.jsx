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
    
    // 現在の会計年度を計算する関数
    const getCurrentFiscalYear = () => {
        const today = new Date();
        // 1月, 2月は前年の年度に属する
        return today.getMonth() < 2 ? today.getFullYear() - 1 : today.getFullYear();
    };

    const [selectedYear, setSelectedYear] = useState(getCurrentFiscalYear);
    const [selectedProperty, setSelectedProperty] = useState(''); // '全施設' を示す空文字

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 初期表示用の年度リストを設定
    useEffect(() => {
        const currentYear = getCurrentFiscalYear();
        setAvailableYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
    }, []);

    // 選択された年度や施設が変わったらデータを再取得
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
        
        // 会計年度（3月始まり）でソート
        const sorted = [...monthlyData].sort((a, b) => {
            const monthA = parseInt(a.date.split('-')[1]);
            const monthB = parseInt(b.date.split('-')[1]);
            const sortOrderA = monthA < 3 ? monthA + 12 : monthA;
            const sortOrderB = monthB < 3 ? monthB + 12 : monthB;
            return sortOrderA - sortOrderB;
        });

        return sorted.map(item => ({
            ...item,
            // "YYYY-MM" から "M月" 形式に変換
            name: `${parseInt(item.date.split('-')[1])}月`,
        }));
    }, [monthlyData]);
    
    // データから動的に施設リストを生成
    const propertyOptions = useMemo(() => {
        if (monthlyData.length > 0) {
            const keys = new Set();
            monthlyData.forEach(month => {
                Object.keys(month).forEach(key => {
                    // 予約語キーを除外して施設名のみを抽出
                    if (key !== 'date' && key !== 'name' && key !== 'total' && key !== 'revenue') {
                        keys.add(key);
                    }
                });
            });
            return Array.from(keys).sort();
        }
        return [];
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
                        {propertyOptions.map(propName => (
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
                                // 全施設: 積み上げグラフ + 合計の折れ線グラフ
                                <>
                                    {propertyOptions.map((propName, index) => (
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
                                // 特定施設: シンプルな棒グラフ
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
