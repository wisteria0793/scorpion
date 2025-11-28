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
    const [availableProperties, setAvailableProperties] = useState([]);
    
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
            }
        };

        // このロジックは施設リスト取得の課題を解決するものではないが、
        // 別の施設を選択した時に、その施設名がリストに含まれていないと不整合が起きるため、
        // 動的に全施設名を取得するアプローチ自体は必要。
        // 今回はmanagement_typeで集計するため、このロジックは一旦コメントアウト。
        // fetchInitialData();
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
    
    // データから動的に「管理形態」のキーを抽出
    const managementTypeOptions = useMemo(() => {
        if (monthlyData.length > 0 && selectedProperty === '') {
            const keys = new Set();
            monthlyData.forEach(month => {
                Object.keys(month).forEach(key => {
                    if (key !== 'date' && key !== 'name' && key !== 'total' && key !== 'revenue') {
                        keys.add(key);
                    }
                });
            });
            return Array.from(keys).sort();
        }
        return [];
    }, [monthlyData, selectedProperty]);

    // propertyOptionsは当面ハードコードで維持
    const propertyOptions = useMemo(() => {
        return ['巴.com', 'ONE PIECE HOUSE', '巴.com 3', '巴.com 5 Cafe&Stay', '巴.com プレミアムステイ'];
    }, []);


    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

    return (
        <div className="revenue-page">
            <h1>月別 売上レポート {selectedProperty ? `(${selectedProperty})` : '(全施設)'}</h1>
            
            <div className="filters">
                <div className="filter-group">
                    <label htmlFor="selectedYear">会計年度:</label>
                    <select id="selectedYear" name="selectedYear" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}年度</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="selectedProperty">施設:</label>
                    <select id="selectedProperty" name="selectedProperty" value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}>
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
                                // 全施設: 管理形態別の積み上げグラフ + 合計の折れ線グラフ
                                <>
                                    {managementTypeOptions.map((typeName, index) => (
                                        <Bar 
                                            key={typeName} 
                                            yAxisId="left"
                                            dataKey={typeName} 
                                            stackId="a" 
                                            fill={COLORS[index % COLORS.length]} 
                                        />
                                    ))}
                                    <Line type="monotone" yAxisId="left" dataKey="total" name="総売上" stroke="#ff7300" strokeWidth={2} dot={false}/>
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
