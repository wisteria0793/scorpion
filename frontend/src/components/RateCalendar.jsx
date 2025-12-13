// src/components/RateCalendar.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Button, TextField, FormControl,
    InputLabel, Select, MenuItem, CircularProgress, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { ChevronLeft, ChevronRight, Edit } from '@mui/icons-material';
import { fetchDailyRates, updateDailyRate } from '../services/dailyRateApi';
import { getProperties } from '../services/propertyApi';

function RateCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState('');
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editDialog, setEditDialog] = useState({ open: false, rate: null });

    useEffect(() => {
        // 施設一覧を取得
        getProperties()
            .then(resp => {
                const props = resp.data || [];
                setProperties(props);
                if (props.length > 0 && !selectedProperty) {
                    setSelectedProperty(props[0].id);
                }
            })
            .catch(err => console.error('Failed to load properties', err));
    }, []);

    useEffect(() => {
        if (selectedProperty) {
            loadRates();
        }
    }, [selectedProperty, currentDate]);

    const loadRates = async () => {
        setLoading(true);
        try {
            // 当月の1日から月末までのデータを取得
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            const params = {
                property_id: selectedProperty,
                start_date: firstDay.toISOString().split('T')[0],
                end_date: lastDay.toISOString().split('T')[0]
            };
            
            console.log('Loading rates with params:', params);
            const data = await fetchDailyRates(params);
            console.log('Rates loaded:', data);
            setRates(data);
        } catch (error) {
            console.error('Failed to load rates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleEditRate = (rate) => {
        setEditDialog({ open: true, rate: { ...rate } });
    };

    const handleSaveRate = async () => {
        try {
            await updateDailyRate(editDialog.rate.id, {
                base_price: editDialog.rate.base_price,
                available: editDialog.rate.available,
                min_stay: editDialog.rate.min_stay
            });
            setEditDialog({ open: false, rate: null });
            loadRates();
        } catch (error) {
            console.error('Failed to update rate:', error);
        }
    };

    const getRateForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return rates.find(r => r.date === dateStr);
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const weeks = [];
        let days = [];

        // 月初めの空白
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(<Grid item xs={12/7} key={`empty-${i}`} />);
        }

        // 日付を追加
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const rate = getRateForDate(date);
            const isToday = new Date().toDateString() === date.toDateString();

            days.push(
                <Grid item xs={12/7} key={day}>
                    <Paper
                        elevation={isToday ? 3 : 1}
                        sx={{
                            p: 1,
                            minHeight: 100,
                            border: isToday ? '2px solid #1976d2' : 'none',
                            backgroundColor: rate?.available ? '#ffffff' : '#f5f5f5',
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#f0f0f0' }
                        }}
                        onClick={() => rate && handleEditRate(rate)}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {day}
                        </Typography>
                        {rate && (
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                                    ¥{Number(rate.base_price).toLocaleString()}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    最小{rate.min_stay}泊
                                </Typography>
                                {!rate.available && (
                                    <Typography variant="caption" color="error" display="block">
                                        予約不可
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>
            );

            if (days.length === 7) {
                weeks.push(<Grid container spacing={1} key={`week-${weeks.length}`} sx={{ mb: 1 }}>{days}</Grid>);
                days = [];
            }
        }

        if (days.length > 0) {
            weeks.push(<Grid container spacing={1} key={`week-${weeks.length}`} sx={{ mb: 1 }}>{days}</Grid>);
        }

        return weeks;
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                料金カレンダー
            </Typography>

            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                {/* 施設選択 */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>施設</InputLabel>
                    <Select
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
                        label="施設"
                    >
                        {properties.map(prop => (
                            <MenuItem key={prop.id} value={prop.id}>
                                {prop.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* 月ナビゲーション */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <IconButton onClick={handlePreviousMonth}>
                        <ChevronLeft />
                    </IconButton>
                    <Typography variant="h5">
                        {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                    </Typography>
                    <IconButton onClick={handleNextMonth}>
                        <ChevronRight />
                    </IconButton>
                </Box>

                {/* 曜日ヘッダー */}
                <Grid container spacing={1} sx={{ mb: 1 }}>
                    {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                        <Grid item xs={12/7} key={day}>
                            <Typography variant="body2" align="center" sx={{ fontWeight: 'bold' }}>
                                {day}
                            </Typography>
                        </Grid>
                    ))}
                </Grid>

                {/* カレンダー */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    renderCalendar()
                )}
            </Paper>

            {/* 料金編集ダイアログ */}
            <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, rate: null })}>
                <DialogTitle>料金設定を編集</DialogTitle>
                <DialogContent>
                    {editDialog.rate && (
                        <Box sx={{ pt: 2 }}>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                日付: {editDialog.rate.date}
                            </Typography>
                            <TextField
                                label="基本料金"
                                type="number"
                                fullWidth
                                value={editDialog.rate.base_price}
                                onChange={(e) => setEditDialog({
                                    ...editDialog,
                                    rate: { ...editDialog.rate, base_price: e.target.value }
                                })}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="最小宿泊数"
                                type="number"
                                fullWidth
                                value={editDialog.rate.min_stay}
                                onChange={(e) => setEditDialog({
                                    ...editDialog,
                                    rate: { ...editDialog.rate, min_stay: parseInt(e.target.value) }
                                })}
                                sx={{ mb: 2 }}
                            />
                            <FormControl fullWidth>
                                <InputLabel>予約可否</InputLabel>
                                <Select
                                    value={editDialog.rate.available}
                                    onChange={(e) => setEditDialog({
                                        ...editDialog,
                                        rate: { ...editDialog.rate, available: e.target.value }
                                    })}
                                    label="予約可否"
                                >
                                    <MenuItem value={true}>予約可能</MenuItem>
                                    <MenuItem value={false}>予約不可</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog({ open: false, rate: null })}>
                        キャンセル
                    </Button>
                    <Button onClick={handleSaveRate} variant="contained">
                        保存
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default RateCalendar;
