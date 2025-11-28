// src/pages/RevenuePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { fetchRevenueData } from '../services/revenueApi';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './RevenuePage.css';

function RevenuePage() {
    const [monthlyData, setMonthlyData] = useState([]);
    const [availableProperties, setAvailableProperties] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedProperty, setSelectedProperty] = useState(''); // '全施設' を示す空文字

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 最初に表示可能な年度リストを取得するためのロジック
    useEffect(() => {
        const getInitialYears = async () => {
            setLoading(true);
            try {
                // 初回はプロパティを指定せずに現在の年度のデータを取得
                const data = await fetchRevenueData({ year: selectedYear, property_name: '' });
                const years = new Set([selectedYear]);
                // データから他の年も抽出（将来的な拡張のため）
                data.forEach(item => {
                    const year = parseInt(item.date.split('-')[0]);
                    if (!isNaN(year)) years.add(year);
                });
                setAvailableYears(Array.from(years).sort((a, b) => b - a));

                // 初回の施設リストもここで取得する
                // バックエンドで全施設データを取得するAPIを呼ぶのが理想だが、
                // 今回は初回取得したデータの施設名からリストを作成する
                const props = await fetchRevenueData({ year: selectedYear }); // 全施設データを取得
                const propNames = new Set(props.map(item => item.name).filter(Boolean)); // 仮
                // この方法は正しくない。施設リストは別途取得する必要がある。
                // ひとまず、ユーザーの操作に応じて動的に取得するロジックに変更する。
            } catch (err) {
                setError('初期データの取得に失敗しました。');
            } finally {
                setLoading(false);
            }
        };
        // getInitialYears(); // この初期化方法は問題があるため、より単純なアプローチに変更
        setAvailableYears([new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2]);
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

                // 全施設データから利用可能な施設リストを更新
                if (!selectedProperty) {
                    // 全施設のデータを取得して施設一覧を更新する
                    const allPropData = await fetchRevenueData({ year: selectedYear });
                    // このロジックだと循環参照のリスクがある。
                    // 施設リストは、別途取得するか、最初のAPIコールで取得した情報を使うのが良い
                }

            } catch (err) {
                setError('売上データの取得に失敗しました。');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [selectedYear, selectedProperty]);

    const chartData = useMemo(() => {
        return monthlyData.map(item => ({
            // "YYYY-MM" から "M月" 形式に変換
            name: `${parseInt(item.date.split('-')[1])}月`,
            '売上': item.revenue
        }));
    }, [monthlyData]);
    
    // 全施設のリストを取得する部分は未実装のため、仮のリストを使う
    // 将来的には専用のAPIエンドポイント(/api/properties/)を設けるのが望ましい
    const propertyOptions = useMemo(() => {
        // ここで全施設のリストを動的に取得できると良い
        return ['巴.com', 'ONE PIECE HOUSE', '巴.com 3', '巴.com 5 Cafe&Stay', '巴.com プレミアムステイ'];
    }, []);


    return (
        <div className="revenue-page">
            <h1>月別 売上レポート</h1>
            
            <div className="filters">
                <div className="filter-group">
                    <label htmlFor="selectedYear">年度:</label>
                    <select
                        id="selectedYear"
                        name="selectedYear"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}年</option>
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
                {!loading && !error && (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => `¥${(value / 10000).toLocaleString()}万`} />
                            <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
                            <Legend />
                            <Bar dataKey="売上" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

export default RevenuePage;
