// src/pages/RevenuePage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchRevenueData, getLastSyncTime } from '../services/revenueApi'; // getLastSyncTime をインポート
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './RevenuePage.css';

// (省略) ... カスタム凡例・ツールチップコンポーネントは変更なし ...
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
            const nameA = a.name;
            const nameB = b.name;

            const indexA = desiredOrder.indexOf(nameA);
            const indexB = desiredOrder.indexOf(nameB);

            // desiredOrder にない項目はアルファベット順（または最後）
            // 両方とも desiredOrder にない場合
            if (indexA === -1 && indexB === -1) {
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            }
            // どちらか一方だけ desiredOrder にない場合、ある方を優先
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;

            return indexA - indexB;
        });

        return (
            <div className="custom-tooltip-window"> {/* custom-tooltip-window クラスを適用 */}
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
    
    const [lastSyncTime, setLastSyncTime] = useState(null); // 最終同期時刻用のstate
    const [syncTimeLoading, setSyncTimeLoading] = useState(true);

    const getCurrentFiscalYear = () => {
        const today = new Date();
        return today.getMonth() < 2 ? today.getFullYear() - 1 : today.getFullYear();
    };

    const [selectedYear, setSelectedYear] = useState(getCurrentFiscalYear);
    const [selectedProperty, setSelectedProperty] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 初期データロード (会計年度リスト、施設リスト、最終同期時刻)
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
                setLastSyncTime(null); // エラー時はnullのまま
            } finally {
                setSyncTimeLoading(false);
            }
        };
        loadSyncTime();
    }, []);

    // グラフデータロード
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
        
        if (selectedYear) {
             loadData();
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

    // 最終更新日時をフォーマットする関数
    const formatSyncTime = (timeString) => {
        if (!timeString) return '不明';
        const date = new Date(timeString);
        return date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="revenue-page">
            <div className="page-header">
                <h1>月別 売上レポート {selectedProperty ? `(${selectedProperty})` : '(全施設)'}</h1>
                <div className="sync-status">
                    {syncTimeLoading ? (
                        <span>最終更新日時: 読み込み中...</span>
                    ) : (
                        <span>最終更新日時: {formatSyncTime(lastSyncTime)}</span>
                    )}
                </div>
            </div>
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
                                        <Bar key={typeName} yAxisId="left" dataKey={typeName} stackId="a" fill={COLORS[index % COLORS.length]} name={typeName} />
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
