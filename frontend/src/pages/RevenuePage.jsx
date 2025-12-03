// src/pages/RevenuePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { fetchRevenueData, fetchYoYRevenueData, fetchNationalityData, getLastSyncTime } from '../services/revenueApi';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart
} from 'recharts';
import './RevenuePage.css';

// (Existing custom components remain the same)
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
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const desiredOrder = ['総売上', '委託管理', '自社管理', 'current_year', 'previous_year'];
        const nameMap = { 'current_year': '当年売上', 'previous_year': '前年売上' };
        const sortedPayload = [...payload].sort((a, b) => {
            const nameA = a.name;
            const nameB = b.name;
            const indexA = desiredOrder.indexOf(nameA);
            const indexB = desiredOrder.indexOf(nameB);
            if (indexA === -1 && indexB === -1) { return nameA.localeCompare(nameB); }
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
                            {`${nameMap[entry.name] || entry.name}: ¥${entry.value ? entry.value.toLocaleString() : 0}`}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
    return null;
};


function RevenuePage() {
    const [view, setView] = useState('monthly'); // 'monthly', 'yoy', 'nationality'
    const [monthlyData, setMonthlyData] = useState([]);
    const [yoyData, setYoyData] = useState([]);
    const [nationalityData, setNationalityData] = useState([]);
    
    const [availableYears, setAvailableYears] = useState([]);
    const [availableProperties, setAvailableProperties] = useState([]);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [syncTimeLoading, setSyncTimeLoading] = useState(true);

    const getCurrentFiscalYear = () => {
        const today = new Date();
        return today.getMonth() < 2 ? today.getFullYear() - 1 : today.getFullYear();
    };

    const [selectedYear, setSelectedYear] = useState(getCurrentFiscalYear);
    const [selectedProperty, setSelectedProperty] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const currentYear = getCurrentFiscalYear();
        setAvailableYears([currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
        setAvailableProperties(['ゲストハウス巴.com', 'ONE PIECE HOUSE', '巴.com3 Music&Stay', '巴.com4 Motomachi', '巴.com5 Cafe&Stay', '巴.com PremiumStay', 'mimosa', 'Iris']);
        
        const loadSyncTime = async () => {
            try {
                setSyncTimeLoading(true);
                const data = await getLastSyncTime();
                setLastSyncTime(data.last_sync_time);
            } catch (err) {
                console.error("Failed to load last sync time:", err);
            } finally {
                setSyncTimeLoading(false);
            }
        };
        loadSyncTime();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = { year: selectedYear, property_name: selectedProperty };
                let data;
                switch (view) {
                    case 'monthly':
                        data = await fetchRevenueData(params);
                        setMonthlyData(data);
                        break;
                    case 'yoy':
                        data = await fetchYoYRevenueData(params);
                        setYoyData(data);
                        break;
                    case 'nationality':
                        data = await fetchNationalityData(params);
                        setNationalityData(data);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                setError('データの取得に失敗しました。');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        
        if (selectedYear) {
             loadData();
        }
    }, [selectedYear, selectedProperty, view]);

    const formatSyncTime = (timeString) => {
        if (!timeString) return '不明';
        const date = new Date(timeString);
        return date.toLocaleString('ja-JP');
    };

    const renderCurrentView = () => {
        if (loading) return <p>読み込み中...</p>;
        if (error) return <p className="error">{error}</p>;

        switch (view) {
            case 'monthly':
                return <MonthlyChart data={monthlyData} property={selectedProperty} />;
            case 'yoy':
                return <YoYChart data={yoyData} />;
            case 'nationality':
                return <NationalityChart data={nationalityData} />;
            default:
                return <p>表示するデータがありません。</p>;
        }
    };

    return (
        <div className="revenue-page">
            <div className="page-header">
                <h1>売上分析レポート {selectedProperty ? `(${selectedProperty})` : '(全施設)'}</h1>
                <div className="sync-status">
                    {syncTimeLoading ? '読み込み中...' : `最終更新日時: ${formatSyncTime(lastSyncTime)}`}
                </div>
            </div>
            <div className="filters">
                <div className="filter-group">
                    <label>会計年度:</label>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                        {availableYears.map(year => <option key={year} value={year}>{year}年度</option>)}
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
            <div className="view-selector">
                <button onClick={() => setView('monthly')} className={view === 'monthly' ? 'active' : ''}>月別売上</button>
                <button onClick={() => setView('yoy')} className={view === 'yoy' ? 'active' : ''}>前年同月比</button>
                <button onClick={() => setView('nationality')} className={view === 'nationality' ? 'active' : ''}>国籍比率</button>
            </div>
            <div className="data-display">
                {renderCurrentView()}
            </div>
        </div>
    );
}

// Chart Components
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const MonthlyChart = ({ data, property }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return [...data].sort((a, b) => {
            const monthA = parseInt(a.date.split('-')[1]);
            const monthB = parseInt(b.date.split('-')[1]);
            const sortOrderA = monthA < 3 ? monthA + 12 : monthA;
            const sortOrderB = monthB < 3 ? monthB + 12 : monthB;
            return sortOrderA - sortOrderB;
        }).map(item => ({ ...item, name: `${parseInt(item.date.split('-')[1])}月` }));
    }, [data]);

    const managementTypeOptions = useMemo(() => {
        if (data.length > 0 && property === '') {
            const keys = new Set();
            data.forEach(month => {
                Object.keys(month).forEach(key => {
                    if (key !== 'date' && key !== 'name' && key !== 'total' && key !== 'revenue') keys.add(key);
                });
            });
            return Array.from(keys).sort();
        }
        return [];
    }, [data, property]);

    if (!chartData.length) return <p>表示するデータがありません。</p>;
    return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" tickFormatter={(value) => `¥${(value / 10000).toLocaleString()}万`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
                {property === '' ? (
                    <>
                        <Line type="monotone" yAxisId="left" dataKey="total" name="総売上" stroke="#ff7300" />
                        {managementTypeOptions.map((typeName, index) => (
                            <Bar key={typeName} yAxisId="left" dataKey={typeName} stackId="a" fill={COLORS[index % COLORS.length]} name={typeName} />
                        ))}
                    </>
                ) : (
                    <Bar yAxisId="left" dataKey="revenue" name="売上" fill="#8884d8" />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
};

const YoYChart = ({ data }) => {
    if (!data.length) return <p>表示するデータがありません。</p>;
    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `¥${(value / 10000).toLocaleString()}万`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="previous_year" name="前年売上" fill="#82ca9d" />
                <Bar dataKey="current_year" name="当年売上" fill="#8884d8" />
            </BarChart>
        </ResponsiveContainer>
    );
};

const NationalityChart = ({ data }) => {
    if (!data.length) return <p>表示するデータがありません。</p>;
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };
    return (
        <ResponsiveContainer width="100%" height={400}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="country"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default RevenuePage;