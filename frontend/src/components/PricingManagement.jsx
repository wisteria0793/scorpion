// src/components/PricingManagement.jsx
/**
 * 施設の価格設定と在庫管理を行うコンポーネント - ハイブリッド型
 * 
 * UI構成:
 * - タブナビゲーション
 *   1. 基本設定：フォーム形式の基本情報入力
 *   2. カレンダー：日別の価格・ブラックアウト管理
 *   3. インポート・同期：CSV操作とBeds24連携
 * 
 * 機能:
 * - 基本料金、基本人数、追加料金の管理
 * - 日別の価格設定（カレンダー表示）
 * - ブラックアウト日の設定
 * - CSVのインポート/エクスポート
 * - Beds24との同期
 */

import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Tabs, Tab, TextField, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, Grid, Card, CardContent, Typography, Switch, FormControlLabel, Alert,
    CircularProgress, Select, MenuItem, FormControl, InputLabel, Stack,
    IconButton, Tooltip, Divider, Snackbar
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import SyncIcon from '@mui/icons-material/Sync';
import GetAppIcon from '@mui/icons-material/GetApp';
import PublishIcon from '@mui/icons-material/Publish';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import {
    fetchMonthlyPricing,
    updateMonthlyPricing,
    updateBasicSettings,
    syncWithBeds24,
    exportPricingToCSV,
    importPricingFromCSV,
} from '../services/pricingApi';
import { fetchProperties } from '../services/revenueApi';

// ============================================================================
// 1. 基本設定パネル
// ============================================================================
const BasicSettingsPanel = ({ property, basicSettings, onSettingsSaved, loading }) => {
    const [settings, setSettings] = useState(basicSettings);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSettings(basicSettings);
    }, [basicSettings]);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await updateBasicSettings(property.id, settings);
            setEditDialogOpen(false);
            onSettingsSaved?.(settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">基本設定</Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setEditDialogOpen(true)}
                >
                    編集
                </Button>
            </Box>

            <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #ddd' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>基本料金</Typography>
                    <Typography variant="body2">¥{settings.basePrice.toLocaleString()} / 泊</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #ddd' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>基本人数</Typography>
                    <Typography variant="body2">{settings.baseGuests} 名</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #ddd' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>追加大人料金</Typography>
                    <Typography variant="body2">¥{settings.adultExtraPrice.toLocaleString()} / 名</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #ddd' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>追加子供料金</Typography>
                    <Typography variant="body2">¥{settings.childExtraPrice.toLocaleString()} / 名</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>最小宿泊日数</Typography>
                    <Typography variant="body2">{settings.minNights} 泊</Typography>
                </Box>
            </Stack>

            {/* 編集ダイアログ */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>基本設定を編集</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        <TextField
                            label="基本料金 (¥/泊)"
                            type="number"
                            value={settings.basePrice}
                            onChange={(e) => setSettings({ ...settings, basePrice: parseInt(e.target.value) || 0 })}
                            fullWidth
                            inputProps={{ min: 0 }}
                        />
                        <TextField
                            label="基本人数"
                            type="number"
                            value={settings.baseGuests}
                            onChange={(e) => setSettings({ ...settings, baseGuests: parseInt(e.target.value) || 1 })}
                            fullWidth
                            inputProps={{ min: 1 }}
                        />
                        <TextField
                            label="追加大人料金 (¥/名)"
                            type="number"
                            value={settings.adultExtraPrice}
                            onChange={(e) => setSettings({ ...settings, adultExtraPrice: parseInt(e.target.value) || 0 })}
                            fullWidth
                            inputProps={{ min: 0 }}
                        />
                        <TextField
                            label="追加子供料金 (¥/名)"
                            type="number"
                            value={settings.childExtraPrice}
                            onChange={(e) => setSettings({ ...settings, childExtraPrice: parseInt(e.target.value) || 0 })}
                            fullWidth
                            inputProps={{ min: 0 }}
                        />
                        <TextField
                            label="最小宿泊日数"
                            type="number"
                            value={settings.minNights}
                            onChange={(e) => setSettings({ ...settings, minNights: parseInt(e.target.value) || 1 })}
                            fullWidth
                            inputProps={{ min: 1 }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
                    <Button onClick={handleSaveSettings} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : '保存'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

// ============================================================================
// 2. カレンダーグリッド表示
// ============================================================================
const CalendarGridView = ({ currentMonth, currentYear, onDateClick, calendarData, basePrice }) => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

    const getDayData = (day) => {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return calendarData.find(d => d.date === dateKey) || { price: basePrice, isBlackout: false };
    };

    const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

    return (
        <Box sx={{ mt: 2 }}>
            {/* 曜日ヘッダー */}
            <Grid container spacing={0.5} sx={{ mb: 1 }}>
                {dayLabels.map((label) => (
                    <Grid item xs={12 / 7} key={label}>
                        <Box sx={{ textAlign: 'center', fontWeight: 600, py: 1, fontSize: '0.875rem' }}>
                            {label}
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {/* カレンダーグリッド */}
            <Grid container spacing={0.5}>
                {/* 前月の日付を埋める */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <Grid item xs={12 / 7} key={`empty-${i}`}>
                        <Box sx={{ p: 1, minHeight: 85, opacity: 0.2, bgcolor: '#f5f5f5' }} />
                    </Grid>
                ))}

                {/* 当月の日付 */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayData = getDayData(day);
                    const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
                    const price = dayData.price || basePrice;
                    const formattedPrice = `¥${(price / 1000).toFixed(1)}K`;

                    return (
                        <Grid item xs={12 / 7} key={`day-${day}`}>
                            <Card
                                sx={{
                                    p: 1,
                                    minHeight: 85,
                                    cursor: 'pointer',
                                    border: isToday ? '2px solid #ff7300' : '1px solid #ddd',
                                    bgcolor: dayData.isBlackout ? '#ffebee' : isToday ? '#fff3e0' : '#fafafa',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        boxShadow: 3,
                                        transform: 'scale(1.02)',
                                    },
                                }}
                                onClick={() => onDateClick(day)}
                            >
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    {day}
                                </Typography>
                                {dayData.isBlackout ? (
                                    <Box sx={{ textAlign: 'center', py: 1 }}>
                                        <Typography variant="h6" sx={{ color: '#d32f2f' }}>🚫</Typography>
                                    </Box>
                                ) : (
                                    <Typography 
                                        variant="caption" 
                                        sx={{ color: '#1976d2', fontWeight: 700, display: 'block' }}
                                    >
                                        {formattedPrice}
                                    </Typography>
                                )}
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};

// ============================================================================
// 3. メインコンポーネント
// ============================================================================
function PricingManagement() {
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState(null);
    const [editDateDialogOpen, setEditDateDialogOpen] = useState(false);
    
    const [calendarData, setCalendarData] = useState([]);
    const [basicSettings, setBasicSettings] = useState({
        basePrice: 10000,
        baseGuests: 4,
        adultExtraPrice: 3000,
        childExtraPrice: 1500,
        minNights: 1,
    });
    
    const [loading, setLoading] = useState(false);
    const [editingPrice, setEditingPrice] = useState('');
    const [editingBlackout, setEditingBlackout] = useState(false);
    const [editingReason, setEditingReason] = useState('');
    
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [syncType, setSyncType] = useState('basic');
    const [syncing, setSyncing] = useState(false);

    const monthName = new Date(currentYear, currentMonth).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
    });

    // 施設一覧を取得
    useEffect(() => {
        const loadProperties = async () => {
            try {
                const data = await fetchProperties();
                setProperties(data);
                if (data.length > 0) {
                    setSelectedProperty(data[0]);
                }
            } catch (error) {
                showSnackbar('施設一覧の読み込みに失敗しました', 'error');
            }
        };
        loadProperties();
    }, []);

    // カレンダーデータを取得
    useEffect(() => {
        if (selectedProperty) {
            loadMonthlyData();
        }
    }, [currentMonth, currentYear, selectedProperty]);

    const loadMonthlyData = async () => {
        if (!selectedProperty) return;
        
        setLoading(true);
        try {
            const data = await fetchMonthlyPricing(selectedProperty.id, currentYear, currentMonth + 1);
            setCalendarData(data.calendarData);
            setBasicSettings(data.basicSettings);
        } catch (error) {
            showSnackbar('データの読み込みに失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDateClick = (day) => {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = calendarData.find(d => d.date === dateKey);
        
        setSelectedDate(day);
        setEditingPrice(dayData?.price?.toString() || basicSettings.basePrice.toString());
        setEditingBlackout(dayData?.isBlackout || false);
        setEditingReason(dayData?.blackoutReason || '');
        setEditDateDialogOpen(true);
    };

    const handleSaveDateSettings = async () => {
        if (!selectedDate || !selectedProperty) return;

        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
        const updates = [{
            date: dateKey,
            price: editingBlackout ? null : parseInt(editingPrice),
            isBlackout: editingBlackout,
            blackoutReason: editingReason,
            minNights: basicSettings.minNights,
        }];

        try {
            await updateMonthlyPricing(selectedProperty.id, currentYear, currentMonth + 1, updates);
            
            // ローカルステートを更新
            setCalendarData(prev => {
                const newData = [...prev];
                const index = newData.findIndex(d => d.date === dateKey);
                if (index >= 0) {
                    newData[index] = updates[0];
                } else {
                    newData.push(updates[0]);
                }
                return newData.sort((a, b) => new Date(a.date) - new Date(b.date));
            });

            setEditDateDialogOpen(false);
            showSnackbar('設定を保存しました', 'success');
        } catch (error) {
            showSnackbar('設定の保存に失敗しました', 'error');
        }
    };

    const handleBeds24Sync = async () => {
        if (!selectedProperty) return;
        
        setSyncing(true);
        try {
            await syncWithBeds24(selectedProperty.id, syncType);
            await loadMonthlyData(); // データを再読み込み
            showSnackbar('Beds24と同期しました', 'success');
        } catch (error) {
            showSnackbar('同期に失敗しました', 'error');
        } finally {
            setSyncing(false);
        }
    };

    const handleCSVExport = () => {
        if (!selectedProperty) return;
        
        const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
        exportPricingToCSV(selectedProperty.id, startDate, endDate);
    };

    const handleCSVImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !selectedProperty) return;

        try {
            await importPricingFromCSV(selectedProperty.id, file);
            await loadMonthlyData();
            showSnackbar('CSVをインポートしました', 'success');
        } catch (error) {
            showSnackbar('CSVのインポートに失敗しました', 'error');
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    if (loading && calendarData.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (!selectedProperty) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>施設を読み込み中...</Box>;
    }

    return (
        <Box>
            {/* ヘッダー */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" component="h1">
                        施設価格設定
                    </Typography>
                    <FormControl sx={{ minWidth: 300, mt: 2 }}>
                        <InputLabel>施設を選択</InputLabel>
                        <Select
                            value={selectedProperty.id}
                            label="施設を選択"
                            onChange={(e) => {
                                const property = properties.find(p => p.id === e.target.value);
                                setSelectedProperty(property);
                            }}
                        >
                            {properties.map(property => (
                                <MenuItem key={property.id} value={property.id}>
                                    {property.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="CSVエクスポート">
                        <Button variant="outlined" size="small" startIcon={<GetAppIcon />} onClick={handleCSVExport}>
                            エクスポート
                        </Button>
                    </Tooltip>
                </Stack>
            </Box>

            {/* タブナビゲーション */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                    <Tab label="基本設定" />
                    <Tab label="カレンダー" />
                    <Tab label="インポート・同期" />
                </Tabs>
            </Box>

            {/* タブ1: 基本設定 */}
            {tabValue === 0 && (
                <Grid item xs={12} md={6}>
                    <Grid item xs={12} md={6}>
                        <BasicSettingsPanel 
                            property={selectedProperty} 
                            basicSettings={basicSettings}
                            loading={loading} 
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                料金計算の仕組み
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                                基本料金は、基本人数での1泊分の価格です。基本人数を超える場合、追加大人料金または追加子供料金が加算されます。
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" gutterBottom>
                                例：基本料金¥10,000（4名）、追加大人料金¥3,000
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                5名の予約 → ¥10,000 + ¥3,000 = ¥13,000<br />
                                6名の予約 → ¥10,000 + ¥3,000 × 2 = ¥16,000
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* タブ2: カレンダー */}
            {tabValue === 1 && (
                <Paper sx={{ p: 3 }}>
                    {/* 月ナビゲーション */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <IconButton onClick={handlePrevMonth} size="small">
                            <ChevronLeftIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ minWidth: 150, textAlign: 'center' }}>
                            {monthName}
                        </Typography>
                        <IconButton onClick={handleNextMonth} size="small">
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <CalendarGridView
                            currentMonth={currentMonth}
                            currentYear={currentYear}
                            onDateClick={handleDateClick}
                            calendarData={calendarData}
                            basePrice={basicSettings.basePrice}
                        />
                    )}

                    {/* 日付編集ダイアログ */}
                    {selectedDate && (
                        <Dialog open={editDateDialogOpen} onClose={() => setEditDateDialogOpen(false)} maxWidth="sm" fullWidth>
                            <DialogTitle>
                                {currentYear}年{currentMonth + 1}月{selectedDate}日の設定
                            </DialogTitle>
                            <DialogContent sx={{ pt: 2 }}>
                                <Stack spacing={2}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={editingBlackout}
                                                onChange={(e) => setEditingBlackout(e.target.checked)}
                                            />
                                        }
                                        label="この日をブラックアウト（予約不可）"
                                    />
                                    
                                    {!editingBlackout && (
                                        <TextField
                                            label="価格 (¥/泊)"
                                            type="number"
                                            value={editingPrice}
                                            onChange={(e) => setEditingPrice(e.target.value)}
                                            fullWidth
                                            inputProps={{ min: 0 }}
                                        />
                                    )}
                                    
                                    {editingBlackout && (
                                        <TextField
                                            label="ブラックアウト理由（オプション）"
                                            value={editingReason}
                                            onChange={(e) => setEditingReason(e.target.value)}
                                            fullWidth
                                            multiline
                                            rows={2}
                                            placeholder="例：メンテナンス中"
                                        />
                                    )}
                                </Stack>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setEditDateDialogOpen(false)}>キャンセル</Button>
                                <Button variant="contained" onClick={handleSaveDateSettings}>
                                    保存
                                </Button>
                            </DialogActions>
                        </Dialog>
                    )}
                </Paper>
            )}

            {/* タブ3: インポート・同期 */}
            {tabValue === 2 && (
                <Grid container spacing={3}>
                    {/* CSVインポート */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                CSVインポート
                            </Typography>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                日付,価格,ブラックアウト の形式でCSVファイルをアップロード
                            </Alert>
                            <Button
                                variant="contained"
                                component="label"
                                startIcon={<PublishIcon />}
                                fullWidth
                            >
                                ファイルを選択
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    hidden 
                                    onChange={handleCSVImport}
                                />
                            </Button>
                        </Paper>
                    </Grid>

                    {/* Beds24同期 */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Beds24との同期
                            </Typography>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                同期時に一部データが上書きされる可能性があります
                            </Alert>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>同期範囲</InputLabel>
                                <Select 
                                    value={syncType}
                                    label="同期範囲"
                                    onChange={(e) => setSyncType(e.target.value)}
                                >
                                    <MenuItem value="basic">基本設定のみ</MenuItem>
                                    <MenuItem value="calendar">基本設定 + 日別価格</MenuItem>
                                    <MenuItem value="all">全て（上書き）</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                fullWidth
                                startIcon={<SyncIcon />}
                                onClick={handleBeds24Sync}
                                disabled={syncing}
                            >
                                {syncing ? <CircularProgress size={24} /> : '同期開始'}
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* スナックバー */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <MuiAlert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </MuiAlert>
            </Snackbar>
        </Box>
    );
}

export default PricingManagement;
