// src/components/ReservationList.jsx
import React, { useState, useEffect } from 'react';
import { fetchMonthlyReservations } from '../services/reservationApi';
import { 
    Box, Typography, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, FormControl, InputLabel, Select, MenuItem, Grid, CircularProgress 
} from '@mui/material';

function ReservationList() {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    const currentYear = new Date().getFullYear();
    const [availableYears, setAvailableYears] = useState([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
    const [availableProperties, setAvailableProperties] = useState(['ゲストハウス巴.com', 'ONE PIECE HOUSE', '巴.com3 Music&Stay', '巴.com4 Motomachi', '巴.com5 Cafe&Stay', '巴.com PremiumStay', 'mimosa', 'Iris']);

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedProperty, setSelectedProperty] = useState('');

    useEffect(() => {
        setLoading(true);
        const params = {
            year: selectedYear,
            month: selectedMonth,
            property_name: selectedProperty,
        };
        fetchMonthlyReservations(params)
            .then(data => {
                setReservations(data);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [selectedYear, selectedMonth, selectedProperty]);

    const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

    if (loading) return <CircularProgress />;

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>月別 予約一覧</Typography>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} sm={3}>
                        <FormControl fullWidth>
                            <InputLabel>年</InputLabel>
                            <Select value={selectedYear} label="年" onChange={(e) => setSelectedYear(e.target.value)}>
                                {availableYears.map(year => <MenuItem key={year} value={year}>{year}年</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid xs={12} sm={3}>
                         <FormControl fullWidth>
                            <InputLabel>月</InputLabel>
                            <Select value={selectedMonth} label="月" onChange={(e) => setSelectedMonth(e.target.value)}>
                                {monthOptions.map(month => <MenuItem key={month} value={month}>{month}月</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid xs={12} sm={6}>
                         <FormControl fullWidth>
                            <InputLabel>施設</InputLabel>
                            <Select value={selectedProperty} label="施設" onChange={(e) => setSelectedProperty(e.target.value)} renderValue={(selected) => selected || '全施設'}>
                                <MenuItem value="">全施設</MenuItem>
                                {availableProperties.map(propName => <MenuItem key={propName} value={propName}>{propName}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
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
        </Box>
    );
}

export default ReservationList;