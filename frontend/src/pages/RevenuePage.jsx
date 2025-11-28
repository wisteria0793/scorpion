// src/pages/RevenuePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { fetchRevenueData } from '../services/revenueApi';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './RevenuePage.css';

// カスタム凡例コンポーネント
const renderLegend = (props) => {
    const { payload } = props;
    if (!payload || payload.length === 0) return null;

    // '総売上' を特定 (dataKeyが'total'のエントリ)
    const totalRevenueEntry = payload.find(entry => entry.dataKey === 'total');
    const otherEntries = payload.filter(entry => entry.dataKey !== 'total');

    // 他の項目をアルファベット順にソート
    otherEntries.sort((a, b) => {
        if (a.value < b.value) return -1;
        if (a.value > b.value) return 1;
        return 0;
    });

    // 総売上があれば先頭に追加
    const sortedPayload = totalRevenueEntry ? [totalRevenueEntry, ...otherEntries] : otherEntries;

    return (
        <ul className="custom-legend">
            {sortedPayload.map((entry, index) => (
                <li key={`item-${index}`} className="custom-legend-item">
                    <span className="legend-icon" style={{ backgroundColor: entry.color }}></span>
                    {entry.value}
                </li>
            ))}
        </ul>
    );
};

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

    const [loading, setLoading] = useState(true); // 初期ロードはtrue
    const [error, setError] = useState(null);

    // 初期化処理
    useEffect(() => {
        const currentYear = getCurrentFiscalYear();
        setAvailableYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);

        const fetchInitialData = async () => {
            setLoading(true); // ロード開始
            try {
                // まずは現在の会計年度の全施設データを取得
                const data = await fetchRevenueData({ year: currentYear, property_name: '' });
                setMonthlyData(data); // 初期表示用に取得したデータをセット
                
                // 施設リストはハードコードで対応 (将来的にAPIから取得が理想)
                setAvailableProperties(['巴.com', 'ONE PIECE HOUSE', '巴.com3 Music&Stay', '巴.com5 Cafe&Stay', '巴.com プレミアムステイ', '巴.com motomachi']);
                
            } catch (err) {
                console.error("Failed to fetch initial data", err);
                setError('初期データの取得に失敗しました。');
            } finally {
                setLoading(false); // ロード終了
            }
        };

        fetchInitialData();
    }, []); // マウント時に一度だけ実行

    // フィルター変更時に表示用データを再取得
    useEffect(() => {
        // 初期ロード時または selectedYear が未設定の場合は実行しない
        if (loading && monthlyData.length === 0) { // loadingがtrueでmonthlyDataが空なら初期ロード中
            return;
        }

        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = { year: selectedYear, property_name: selectedProperty };
                const data = await fetchRevenueData(params);
                setMonthlyData(data);
            } catch (err) {
                setError('売上データの取得に失敗しました。');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        
        // selectedYear の初期値が設定されてから、かつマウント時以外の変更時に実行
        // マウント時の初期データ取得は上のuseEffectで処理
        if (selectedYear) {
             loadData();
        }
    }, [selectedYear, selectedProperty]);


    const chartData = useMemo(() => {
        if (!monthlyData || monthlyData.length === 0) return [];
        
        const getSortOrder = (dateStr) => {
            if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) {
                return 0; // 不正なデータはソート順に影響させない
            }
            const month = parseInt(dateStr.split('-')[1]);
            if (isNaN(month)) {
                return 0;
            }
            // 会計年度（3月始まり）でソート
            return month < 3 ? month + 12 : month;
        };

        const sorted = [...monthlyData].sort((a, b) => {
            const sortOrderA = getSortOrder(a.date);
            const sortOrderB = getSortOrder(b.date);
            return sortOrderA - sortOrderB;
        });

        return sorted.map(item => ({ 
            ...item, 
            name: (item.date && item.date.includes('-')) ? `${parseInt(item.date.split('-')[1])}月` : '不明'
        }));
    }, [monthlyData]);
    
    const managementTypeOptions = useMemo(() => {
        if (monthlyData.length > 0 && selectedProperty === '') {
            const keys = new Set();
            monthlyData.forEach(month => {
                Object.keys(month).forEach(key => {
                    if (key !== 'date' && key !== 'name' && key !== 'total' && key !== 'revenue') keys.add(key);
                });
            });
            return Array.from(keys).sort();
        }
        return [];
    }, [monthlyData, selectedProperty]);
    
    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

    return (
        <div className="revenue-page">
            <h1>月別 売上レポート {selectedProperty ? `(${selectedProperty})` : '(全施設)'}</h1>
            <div className="filters">
                <div className="filter-group">
                    <label htmlFor="selectedYear">会計年度:</label>
                    <select id="selectedYear" name="selectedYear" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                        {availableYears.map(year => <option key={year} value={year}>{year}年度</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="selectedProperty">施設:</label>
                    <select id="selectedProperty" name="selectedProperty" value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}>
                        <option value="">全施設</option>
                        {availableProperties.map(propName => <option key={propName} value={propName}>{propName}</option>)}
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
                            <Legend content={renderLegend} />
                            {selectedProperty === '' ? (
                                <>
                                    <Line type="monotone" yAxisId="left" dataKey="total" name="総売上" stroke="#ff7300" strokeWidth={2} dot={false}/>
                                    {managementTypeOptions.map((typeName, index) => (
                                        <Bar key={typeName} yAxisId="left" dataKey={typeName} stackId="a" fill={COLORS[index % COLORS.length]} />
                                    ))}
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
