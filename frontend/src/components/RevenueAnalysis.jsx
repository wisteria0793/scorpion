// src/components/RevenueAnalysis.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { fetchRevenueData, fetchYoYRevenueData, fetchNationalityData, getLastSyncTime } from '../services/revenueApi';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart
} from 'recharts';
import { Box, Typography, Paper, Grid, FormControl, InputLabel, Select, MenuItem, Tabs, Tab, CircularProgress } from '@mui/material';

// Tooltip and Legend components can be reused, but let's give them a slightly better look
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const nameMap = { 'current_year': '当年売上', 'previous_year': '前年売上', 'total': '総売上' };
        return (
            <Paper elevation={3} sx={{ padding: 'var(--spacing-md)', background: 'rgba(255, 255, 255, 0.9)' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>{label}</Typography>
                {payload.map((entry, index) => (
                    <Typography key={`item-${index}`} variant="body2" sx={{ color: entry.color }}>
                        {`${nameMap[entry.name] || entry.name}: ¥${entry.value ? entry.value.toLocaleString() : 0}`}
                    </Typography>
                ))}
            </Paper>
        );
    }
    return null;
};

// Main Component
function RevenueAnalysis() {
    const [view, setView] = useState('monthly'); // 'monthly', 'yoy', 'nationality'
    const [monthlyData, setMonthlyData] = useState([]);
    const [yoyData, setYoyData] = useState([]);
    const [nationalityData, setNationalityData] = useState([]);
    
    const [availableYears, setAvailableYears] = useState([]);
    const [availableProperties, setAvailableProperties] = useState([]);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [loading, setLoading] = useState(true);

    const getCurrentFiscalYear = () => new Date().getMonth() < 2 ? new Date().getFullYear() - 1 : new Date().getFullYear();

    const [selectedYear, setSelectedYear] = useState(getCurrentFiscalYear);
    const [selectedProperty, setSelectedProperty] = useState('');

    useEffect(() => {
        const currentYear = getCurrentFiscalYear();
        setAvailableYears([currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
        setAvailableProperties(['ゲストハウス巴.com', 'ONE PIECE HOUSE', '巴.com3 Music&Stay', '巴.com4 Motomachi', '巴.com5 Cafe&Stay', '巴.com PremiumStay', 'mimosa', 'Iris']);
        getLastSyncTime().then(data => setLastSyncTime(data.last_sync_time));
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = { year: selectedYear, property_name: selectedProperty };
        let dataFetcher;
        switch (view) {
            case 'monthly': dataFetcher = fetchRevenueData(params); break;
            case 'yoy': dataFetcher = fetchYoYRevenueData(params); break;
            case 'nationality': dataFetcher = fetchNationalityData(params); break;
            default: return;
        }

        dataFetcher.then(data => {
            if (view === 'monthly') setMonthlyData(data);
            if (view === 'yoy') setYoyData(data);
            if (view === 'nationality') setNationalityData(data);
        }).finally(() => setLoading(false));
        
    }, [selectedYear, selectedProperty, view]);

    const formatSyncTime = (timeString) => timeString ? new Date(timeString).toLocaleString('ja-JP') : '不明';

    const renderCurrentView = () => {
        if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
        
        switch (view) {
            case 'monthly': return <MonthlyChart data={monthlyData} property={selectedProperty} />;
            case 'yoy': return <YoYChart data={yoyData} />;
            case 'nationality': return <NationalityChart data={nationalityData} />;
            default: return <Typography>表示するデータがありません。</Typography>;
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">売上分析</Typography>
                <Typography variant="caption">最終更新日時: {formatSyncTime(lastSyncTime)}</Typography>
            </Box>
            
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><FormControl fullWidth><InputLabel>会計年度</InputLabel><Select value={selectedYear} label="会計年度" onChange={(e) => setSelectedYear(e.target.value)}>{availableYears.map(y => <MenuItem key={y} value={y}>{y}年度</MenuItem>)}</Select></FormControl></Grid>
                    <Grid item xs={12} sm={6}><FormControl fullWidth><InputLabel>施設</InputLabel><Select value={selectedProperty} label="施設" onChange={(e) => setSelectedProperty(e.target.value)}><MenuItem value="">全施設</MenuItem>{availableProperties.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}</Select></FormControl></Grid>
                </Grid>
            </Paper>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={view} onChange={(e, newValue) => setView(newValue)} centered>
                    <Tab label="月別売上" value="monthly" />
                    <Tab label="前年同月比" value="yoy" />
                    <Tab label="国籍比率" value="nationality" />
                </Tabs>
            </Box>

            <Box sx={{ minHeight: 400 }}>
                {renderCurrentView()}
            </Box>
        </Box>
    );
}

// Chart Components
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const MonthlyChart = ({ data, property }) => {
    const chartData = useMemo(() => !data ? [] : [...data].sort((a, b) => {
        const monthA = parseInt(a.date.split('-')[1]);
        return monthA < 3 ? 1 : -1; // simple sort, can be improved
    }).map(item => ({ ...item, name: `${parseInt(item.date.split('-')[1])}月` })), [data]);
    
    if (chartData.length === 0) return <Typography align="center" sx={{p:4}}>データがありません。</Typography>

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(v) => `¥${(v/10000).toLocaleString()}万`} /><Tooltip content={<CustomTooltip />} /><Legend />{property === '' ? (<><Line type="monotone" dataKey="total" name="総売上" stroke="#ff7300" />{Object.keys(chartData[0] || {}).filter(k=>!['date','name','total','revenue'].includes(k)).map((t,i)=><Bar key={t} dataKey={t} stackId="a" fill={COLORS[i%COLORS.length]} name={t}/>)}</>) : (<Bar dataKey="revenue" name="売上" fill="#8884d8" />)}</ComposedChart>
        </ResponsiveContainer>
    );
};

const YoYChart = ({ data }) => {
    if (!data || data.length === 0) return <Typography align="center" sx={{p:4}}>データがありません。</Typography>;
    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(v) => `¥${(v/10000).toLocaleString()}万`} /><Tooltip content={<CustomTooltip />} /><Legend /><Bar dataKey="previous_year" name="前年売上" fill="#82ca9d" /><Bar dataKey="current_year" name="当年売上" fill="#8884d8" /></BarChart>
        </ResponsiveContainer>
    );
};

const NationalityChart = ({ data }) => {
    if (!data || data.length === 0) return <Typography align="center" sx={{p:4}}>データがありません。</Typography>;
    return (
        <ResponsiveContainer width="100%" height={400}>
            <PieChart><Tooltip content={<CustomTooltip />} /><Legend /><Pie data={data} dataKey="count" nameKey="country" cx="50%" cy="50%" outerRadius={150} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => { const r = innerRadius+(outerRadius-innerRadius)*0.5; const x=cx+r*Math.cos(-midAngle*Math.PI/180); const y=cy+r*Math.sin(-midAngle*Math.PI/180); return <text x={x} y={y} fill="white" textAnchor={x>cx?'start':'end'} dominantBaseline="central">{`${(percent*100).toFixed(0)}%`}</text>}}>{data.map((e,i)=><Cell key={`cell-${i}`} fill={COLORS[i%COLORS.length]} />)}</Pie></PieChart>
        </ResponsiveContainer>
    );
};

export default RevenueAnalysis;
