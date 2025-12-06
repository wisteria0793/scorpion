// src/components/RevenueAnalysis.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { fetchRevenueData, fetchYoYRevenueData, fetchNationalityData, getLastSyncTime } from '../services/revenueApi';
import { fetchMonthlyReservations } from '../services/reservationApi';
import { getProperties } from '../services/propertyApi';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart
} from 'recharts';
import { 
    Box, Typography, Paper, Grid, FormControl, InputLabel, Select, MenuItem, 
    Tabs, Tab, CircularProgress, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Button 
} from '@mui/material';

// Tooltip and Legend components
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
    const [view, setView] = useState('monthly');
    const [monthlyData, setMonthlyData] = useState([]);
    const [yoyData, setYoyData] = useState([]);
    const [nationalityData, setNationalityData] = useState([]);
    
    const getCurrentFiscalYear = () => new Date().getMonth() < 2 ? new Date().getFullYear() - 1 : new Date().getFullYear();
    const initialYear = getCurrentFiscalYear();
    
    const [availableYears, setAvailableYears] = useState([initialYear + 1, initialYear, initialYear - 1, initialYear - 2, initialYear - 3]);
    const [availableProperties, setAvailableProperties] = useState([]);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [loading, setLoading] = useState(true);

    const [clickedMonthDetails, setClickedMonthDetails] = useState(null);
    const [reservationsLoading, setReservationsLoading] = useState(false);

    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [selectedProperty, setSelectedProperty] = useState('');

    useEffect(() => {
        // プロパティ一覧を API から取得（委託管理も含める）
        getProperties()
            .then(resp => {
                const names = Array.from(new Set((resp.data || []).map(p => p.name))).sort();
                if (names.length) setAvailableProperties(names);
            })
            .catch(err => {
                console.warn('Failed to load properties for filter, fallback to empty', err);
                setAvailableProperties([]);
            });
        getLastSyncTime().then(data => setLastSyncTime(data.last_sync_time));
    }, []);

    useEffect(() => {
        setLoading(true);
        setClickedMonthDetails(null); // Reset details when filters change
        const params = { year: selectedYear, property_name: selectedProperty };
        let dataFetcher;
        switch (view) {
            case 'monthly':
                dataFetcher = fetchRevenueData(params);
                break;
            case 'yoy':
                dataFetcher = fetchYoYRevenueData(params);
                break;
            case 'nationality':
                dataFetcher = fetchNationalityData(params);
                break;
            default:
                setLoading(false); // Stop loading if view is invalid
                return;
        }

        dataFetcher.then(data => {
            if (view === 'monthly') setMonthlyData(data);
            if (view === 'yoy') setYoyData(data);
            if (view === 'nationality') setNationalityData(data);
        }).catch(error => {
            console.error("Failed to fetch data:", error);
            // You might want to set an error state here to show a message
        }).finally(() => {
            setLoading(false);
        });
        
    }, [selectedYear, selectedProperty, view]);

    const handleMonthClick = (data) => {
        if (!data || !data.activePayload) return;
        const payload = data.activePayload[0].payload;
        const [year, month] = payload.date.split('-');

        setReservationsLoading(true);
        fetchMonthlyReservations({ year, month, property_name: selectedProperty })
            .then(reservations => {
                setClickedMonthDetails({ reservations, year, month });
            })
            .finally(() => setReservationsLoading(false));
    };

    const formatSyncTime = (timeString) => timeString ? new Date(timeString).toLocaleString('ja-JP') : '不明';

    const renderCurrentView = () => {
        if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
        
        switch (view) {
            case 'monthly': return <MonthlyChart data={monthlyData} property={selectedProperty} onMonthClick={handleMonthClick} />;
            case 'yoy': return <YoYChart data={yoyData} />;
            case 'nationality': return <NationalityChart data={nationalityData} />;
            default: return <Typography>表示するデータがありません。</Typography>;
        }
    };

    return (
        <Box>
            {/* Header and Filters */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">売上分析</Typography>
                <Typography variant="caption">最終更新日時: {formatSyncTime(lastSyncTime)}</Typography>
            </Box>
            
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} sm={4}>
                        <FormControl fullWidth>
                            <InputLabel>会計年度</InputLabel>
                            <Select value={selectedYear} label="会計年度" onChange={(e) => setSelectedYear(e.target.value)}>
                                {availableYears.map(y => <MenuItem key={y} value={y}>{y}年度</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid xs={12} sm={8}>
                        <FormControl fullWidth>
                            <InputLabel>施設</InputLabel>
                            <Select value={selectedProperty} label="施設" onChange={(e) => setSelectedProperty(e.target.value)} renderValue={(selected) => selected || '全施設'}>
                                <MenuItem value="">全施設</MenuItem>
                                {availableProperties.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    {selectedProperty === '' && (
                        <Grid xs={12} sx={{ mt: 1, textAlign: 'right' }}>
                            <Button variant="outlined" onClick={() => {
                                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
                                const url = `${baseUrl}/revenue/csv/?year=${selectedYear}`;
                                window.open(url, '_blank');
                            }}>
                                CSVダウンロード
                            </Button>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={view} onChange={(e, newValue) => setView(newValue)} centered>
                    <Tab label="月別売上" value="monthly" />
                    <Tab label="前年同月比" value="yoy" />
                    <Tab label="国籍比率" value="nationality" />
                </Tabs>
            </Box>

            {/* Chart Area */}
            <Box sx={{ minHeight: 400 }}>
                {renderCurrentView()}
            </Box>

            {/* Reservation Detail Area */}
            {view === 'monthly' && (reservationsLoading ? <CircularProgress sx={{mt: 2}} /> : <ReservationDetailTable details={clickedMonthDetails} />)}
        </Box>
    );
}

// Chart Components
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const MonthlyChart = ({ data, property, onMonthClick }) => {
    const chartData = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => {
            const monthA = parseInt(a.date.split('-')[1]);
            const monthB = parseInt(b.date.split('-')[1]);
            // Fiscal year starts in April, so shift months for correct sorting
            const fiscalMonthA = monthA < 4 ? monthA + 12 : monthA;
            const fiscalMonthB = monthB < 4 ? monthB + 12 : monthB;
            return fiscalMonthA - fiscalMonthB;
        }).map(item => ({ ...item, name: `${parseInt(item.date.split('-')[1])}月` }));
    }, [data]);
    
    if (chartData.length === 0) return <Typography align="center" sx={{p:4}}>データがありません。</Typography>

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} onClick={onMonthClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `¥${(v/10000).toLocaleString()}万`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {property === '' ? (
                    <>
                        <Line type="monotone" dataKey="total" name="総売上" stroke="#ff7300" />
                        {Object.keys(chartData[0] || {}).filter(k=>!['date','name','total','revenue'].includes(k)).map((t,i)=><Bar key={t} dataKey={t} stackId="a" fill={COLORS[i%COLORS.length]} name={t}/>)}
                    </>
                ) : (
                    <Bar dataKey="revenue" name="売上" fill="#8884d8" />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
};

// New component to display reservation details
const ReservationDetailTable = ({ details }) => {
    if (!details) return null;

    const { reservations, year, month } = details;

    return (
        <Paper sx={{ mt: 4, p: 2 }}>
            <Typography variant="h6" gutterBottom>{`${year}年${month}月 予約一覧`}</Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>チェックイン</TableCell>
                            <TableCell>予約者名</TableCell>
                            <TableCell>施設</TableCell>
                            <TableCell>泊数</TableCell>
                            <TableCell>人数</TableCell>
                            <TableCell>合計料金</TableCell>
                            <TableCell>ステータス</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reservations.length > 0 ? (
                            reservations.map(res => (
                                <TableRow key={res.id} hover>
                                    <TableCell>{res.check_in_date}</TableCell>
                                    <TableCell>{res.guest_name}</TableCell>
                                    <TableCell>{res.property_name}</TableCell>
                                    <TableCell>{
                                        new Date(res.check_out_date) > new Date(res.check_in_date) ? 
                                        (new Date(res.check_out_date) - new Date(res.check_in_date)) / (1000 * 60 * 60 * 24) : 1
                                    }泊</TableCell>
                                    <TableCell>{res.num_guests}名</TableCell>
                                    <TableCell>¥{Number(res.total_price).toLocaleString()}</TableCell>
                                    <TableCell>{res.status}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center">表示する予約がありません。</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

const YoYChart = ({ data }) => {
    if (!data || data.length === 0) return <Typography align="center" sx={{p:4}}>データがありません。</Typography>;
    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `¥${(v/10000).toLocaleString()}万`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="previous_year" name="前年売上" fill="#82ca9d" />
                <Bar dataKey="current_year" name="当年売上" fill="#8884d8" />
            </BarChart>
        </ResponsiveContainer>
    );
};

const NationalityChart = ({ data }) => {
    if (!data || data.length === 0) return <Typography align="center" sx={{p:4}}>データがありません。</Typography>;

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={400}>
            <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Pie 
                    data={data} 
                    dataKey="count" 
                    nameKey="country" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={150} 
                    labelLine={false}
                    label={renderCustomizedLabel}
                >
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};

export default RevenueAnalysis;