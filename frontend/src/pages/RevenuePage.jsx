// src/pages/RevenuePage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchRevenueData } from '../services/revenueApi';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './RevenuePage.css';

// カスタム凡例コンポーネント (グラフ下)
const renderLegend = (props) => {
    const { payload } = props;
    if (!payload || payload.length === 0) return null;

    const sortedPayload = [...payload].sort((a, b) => {
        if (a.dataKey === 'total') return -1;
        if (b.dataKey === 'total') return 1;
        if (a.value < b.value) return -1;
        if (a.value > b.value) return 1;
        return 0;
    });

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

// カスタムツールチップコンポーネント (ホバー時)
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        // ユーザーの要望通りの表示順を定義
        const desiredOrder = ['総売上', '委託管理', '自社管理'];

        const sortedPayload = [...payload].sort((a, b) => {
            const indexA = desiredOrder.indexOf(a.name);
            const indexB = desiredOrder.indexOf(b.name);

            // desiredOrder にない項目は後ろに回す
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;

            return indexA - indexB;
        });

        return (
            <div className="custom-tooltip-window">
                <p className="label">{`${label}`}</p>
                <ul className="desc">
                    {sortedPayload.map((entry, index) => (
                        <li key={`item-${index}`} style={{ color: entry.color }}>
                            {`${entry.name}: ¥${entry.value ? entry.value.toLocaleString() : 0}`}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
    return null;
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

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isInitialLoad = useRef(true);

    // 初期化処理
    useEffect(() => {
        const currentYear = getCurrentFiscalYear();
        setAvailableYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
        // 施設リストはハードコードで対応
        setAvailableProperties(['巴.com', 'ONE PIECE HOUSE', '巴.com 3', '巴.com 5 Cafe&Stay', '巴.com プレミアムステイ', 'Guest house 巴.com hakodate motomachi']);
    }, []);

    // データ取得ロジック
    useEffect(() => {
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
        
        // マウント時の初回ロード
        if (isInitialLoad.current) {
            loadData();
            isInitialLoad.current = false;
        } else {
            // フィルター変更時のロード
            if (selectedYear) {
                 loadData();
            }
        }
    }, [selectedYear, selectedProperty]);

    const chartData = useMemo(() => {
        if (!monthlyData || monthlyData.length === 0) return [];
        return [...monthlyData].sort((a, b) => {
            const monthA = parseInt(a.date.split('-')[1]);
            const monthB = parseInt(b.date.split('-')[1]);
            const sortOrderA = monthA < 3 ? monthA + 12 : monthA;
            const sortOrderB = monthB < 3 ? monthB + 12 : monthB;
            return sortOrderA - sortOrderB;
        }).map(item => ({ ...item, name: `${parseInt(item.date.split('-')[1])}月` }));
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
                            <Tooltip content={<CustomTooltip />} />
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
                {!loading && !error && chartData.length === 0 && <p>表示するデータがありません。</p>}
            </div>
        </div>
    );
}

export default RevenuePage;