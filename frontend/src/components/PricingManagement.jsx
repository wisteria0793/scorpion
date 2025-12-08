// src/components/PricingManagement.jsx
/**
 * 施設の価格設定と在庫管理を行うコンポーネント
 * 
 * ハイブリッド型UI:
 * - 左側: 基本設定パネル（フォーム）
 * - 右側: 日別カレンダー（Interactive Grid）
 * 
 * 主な機能:
 * 1. 基本料金、基本人数、追加料金の管理
 * 2. 日別の価格設定（カレンダー表示）
 * 3. ブラックアウト日の設定
 * 4. CSVのインポート/エクスポート
 * 5. Beds24との同期
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Paper, Tabs, Tab, TextField, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, Table, TableHead, TableBody, TableRow, TableCell, Chip,
    Grid, Card, CardContent, Typography, Switch, FormControlLabel, Alert,
    CircularProgress, Select, MenuItem, FormControl, InputLabel, Stack,
    IconButton, Tooltip, Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import GetAppIcon from '@mui/icons-material/GetApp';
import PublishIcon from '@mui/icons-material/Publish';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// ============================================================================
// 1. 基本設定パネル
// ============================================================================
const BasicSettingsPanel = ({ property, onSave, loading }) => {
    const [settings, setSettings] = useState({
        basePrice: 10000,
        baseGuests: 4,
        adultExtraPrice: 3000,
        childExtraPrice: 1500,
        minNights: 1,
        checkInTime: '15:00',
        checkOutTime: '10:00',
    });
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const handleSaveSettings = async () => {
        await onSave(settings);
        setEditDialogOpen(false);
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
                            onChange={(e) => setSettings({ ...settings, basePrice: parseInt(e.target.value) })}
                            fullWidth
                        />
                        <TextField
                            label="基本人数"
                            type="number"
                            value={settings.baseGuests}
                            onChange={(e) => setSettings({ ...settings, baseGuests: parseInt(e.target.value) })}
                            fullWidth
                        />
                        <TextField
                            label="追加大人料金 (¥/名)"
                            type="number"
                            value={settings.adultExtraPrice}
                            onChange={(e) => setSettings({ ...settings, adultExtraPrice: parseInt(e.target.value) })}
                            fullWidth
                        />
                        <TextField
                            label="追加子供料金 (¥/名)"
                            type="number"
                            value={settings.childExtraPrice}
                            onChange={(e) => setSettings({ ...settings, childExtraPrice: parseInt(e.target.value) })}
                            fullWidth
                        />
                        <TextField
                            label="最小宿泊日数"
                            type="number"
                            value={settings.minNights}
                            onChange={(e) => setSettings({ ...settings, minNights: parseInt(e.target.value) })}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
                    <Button onClick={handleSaveSettings} variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : '保存'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

// ============================================================================
// 2. カレンダーグリッド表示
// ============================================================================
const CalendarGridView = ({ currentMonth, currentYear, onDateClick, pricingData }) => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const weeks = Math.ceil((daysInMonth + firstDayOfWeek) / 7);

    const getDayData = (day) => {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return pricingData[dateKey] || { price: null, blackout: false };
    };

    const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

    return (
        <Box sx={{ mt: 2 }}>
            {/* 曜日ヘッダー */}
            <Grid container spacing={0.5} sx={{ mb: 1 }}>
                {dayLabels.map((label) => (
                    <Grid item xs={12 / 7} key={label}>
                        <Box sx={{ textAlign: 'center', fontWeight: 600, py: 1 }}>
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
                        <Box sx={{ p: 1, minHeight: 80, opacity: 0.3 }} />
                    </Grid>
                ))}

                {/* 当月の日付 */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayData = getDayData(day);
                    const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();

                    return (
                        <Grid item xs={12 / 7} key={`day-${day}`}>
                            <Card
                                sx={{
                                    p: 1,
                                    minHeight: 80,
                                    cursor: 'pointer',
                                    border: isToday ? '2px solid #ff7300' : '1px solid #ddd',
                                    bgcolor: dayData.blackout ? '#ffebee' : isToday ? '#fff3e0' : '#fafafa',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        boxShadow: 3,
                                        transform: 'scale(1.02)',
                                    },
                                }}
                                onClick={() => onDateClick(day)}
                            >
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                    {day}
                                </Typography>
                                {dayData.blackout ? (
                                    <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 600, mt: 0.5 }}>
                                        🚫
                                    </Typography>
                                ) : dayData.price ? (
                                    <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 600, mt: 0.5, display: 'block' }}>
                                        ¥{(dayData.price / 1000).toFixed(0)}K
                                    </Typography>
                                ) : (
                                    <Typography variant="caption" sx={{ color: '#999', mt: 0.5, display: 'block' }}>
                                        基本料金
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
function PricingManagement({ propertyId }) {
    const [tabValue, setTabValue] = useState(0);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState(null);
    const [editDateDialogOpen, setEditDateDialogOpen] = useState(false);
    const [pricingData, setPricingData] = useState({});
    const [loading, setLoading] = useState(false);

    // ローカルデータ（本来はAPIから取得）
    const property = {
        id: propertyId,
        name: '〇〇〇ハウス',
        beds24PropertyKey: 'XXXXX',
    };

    const monthName = new Date(currentYear, currentMonth).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
    });

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
        setSelectedDate(day);
        setEditDateDialogOpen(true);
    };

    const handleSaveBasicSettings = async (settings) => {
        setLoading(true);
        // API呼び出しをここに実装
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log('基本設定を保存:', settings);
        setLoading(false);
    };

    return (
        <Box>
            {/* ヘッダー */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    施設価格設定 - {property.name}
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Beds24と同期">
                        <Button variant="outlined" startIcon={<SyncIcon />}>
                            同期
                        </Button>
                    </Tooltip>
                    <Tooltip title="CSVエクスポート">
                        <Button variant="outlined" startIcon={<GetAppIcon />}>
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
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <BasicSettingsPanel property={property} onSave={handleSaveBasicSettings} loading={loading} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                設定ガイド
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                                基本料金は、基本人数（例：4名）での1泊分の価格です。
                                基本人数を超える場合、追加大人料金または追加子供料金が加算されます。
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                                例：基本料金¥10,000（4名）、追加大人料金¥3,000
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                5名の予約 → ¥10,000 + ¥3,000 = ¥13,000
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
                        <Typography variant="h6">{monthName}</Typography>
                        <IconButton onClick={handleNextMonth} size="small">
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>

                    {/* カレンダーグリッド */}
                    <CalendarGridView
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                        onDateClick={handleDateClick}
                        pricingData={pricingData}
                    />

                    {/* 日付編集ダイアログ */}
                    {selectedDate && (
                        <Dialog open={editDateDialogOpen} onClose={() => setEditDateDialogOpen(false)} maxWidth="sm" fullWidth>
                            <DialogTitle>
                                {currentYear}年{currentMonth + 1}月{selectedDate}日の設定
                            </DialogTitle>
                            <DialogContent sx={{ pt: 2 }}>
                                <Stack spacing={2}>
                                    <FormControlLabel
                                        control={<Switch defaultChecked />}
                                        label="カスタム価格を設定"
                                    />
                                    <TextField
                                        label="価格 (¥/泊)"
                                        type="number"
                                        defaultValue="10000"
                                        fullWidth
                                    />
                                    <Divider />
                                    <FormControlLabel
                                        control={<Switch />}
                                        label="この日をブラックアウト（予約不可）"
                                    />
                                    <TextField
                                        label="理由（オプション）"
                                        multiline
                                        rows={2}
                                        fullWidth
                                        placeholder="例：メンテナンス中"
                                    />
                                </Stack>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setEditDateDialogOpen(false)}>キャンセル</Button>
                                <Button variant="contained">保存</Button>
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
                                <input type="file" accept=".csv" hidden />
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
                                <Select defaultValue="basic">
                                    <MenuItem value="basic">基本設定のみ</MenuItem>
                                    <MenuItem value="calendar">基本設定 + 日別価格</MenuItem>
                                    <MenuItem value="all">全て（上書き）</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                fullWidth
                                startIcon={<SyncIcon />}
                            >
                                同期開始
                            </Button>
                            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#999' }}>
                                最後の同期: 2026-03-08 14:30
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}

export default PricingManagement;
