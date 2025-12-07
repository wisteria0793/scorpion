import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import tourismApi from '../services/tourismApi';

const CATEGORY_OPTIONS = [
  { value: 'HISTORIC', label: '歴史的建造物' },
  { value: 'NATURE', label: '自然・景観' },
  { value: 'MUSEUM', label: '博物館・美術館' },
  { value: 'SHOPPING', label: 'ショッピング' },
  { value: 'HOT_SPRING', label: '温泉' },
  { value: 'FOOD', label: 'グルメ・市場' },
  { value: 'OTHER', label: 'その他' },
];

const EVENT_TYPE_OPTIONS = [
  { value: 'FESTIVAL', label: '祭り' },
  { value: 'SEASONAL', label: '季節イベント' },
  { value: 'CULTURAL', label: '文化イベント' },
  { value: 'SPORTS', label: 'スポーツイベント' },
  { value: 'MARKET', label: '市場・マルシェ' },
  { value: 'OTHER', label: 'その他' },
];

const SEASON_OPTIONS = [
  { value: 'SPRING', label: '春 (3-5月)' },
  { value: 'SUMMER', label: '夏 (6-8月)' },
  { value: 'AUTUMN', label: '秋 (9-11月)' },
  { value: 'WINTER', label: '冬 (12-2月)' },
];

function TourismManagement() {
  const [tabValue, setTabValue] = useState(0);
  const [attractions, setAttractions] = useState([]);
  const [events, setEvents] = useState([]);
  const [seasonalRecommendations, setSeasonalRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    loadData();
  }, [tabValue]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tabValue === 0) {
        const data = await tourismApi.getAttractions();
        setAttractions(data);
      } else if (tabValue === 1) {
        const data = await tourismApi.getEvents();
        setEvents(data);
      } else if (tabValue === 2) {
        const data = await tourismApi.getSeasonalRecommendations();
        setSeasonalRecommendations(data);
      }
    } catch (err) {
      setError('データの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditMode(true);
      setCurrentItem(item);
      setFormData(item);
    } else {
      setEditMode(false);
      setCurrentItem(null);
      setFormData(getInitialFormData());
    }
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setCurrentItem(null);
    setFormData({});
    setImageFile(null);
  };

  const getInitialFormData = () => {
    if (tabValue === 0) {
      return {
        name: '',
        category: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        phone_number: '',
        website_url: '',
        opening_hours: '',
        admission_fee: '',
        access_info: '',
        is_active: true,
        display_order: 0,
      };
    } else if (tabValue === 1) {
      return {
        name: '',
        event_type: '',
        description: '',
        venue: '',
        address: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        is_recurring: false,
        contact_info: '',
        website_url: '',
        admission_fee: '',
        is_active: true,
        display_order: 0,
      };
    } else {
      return {
        season: '',
        title: '',
        description: '',
        is_active: true,
        display_order: 0,
      };
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    
    try {
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });
      
      // Add image if selected
      if (imageFile) {
        submitData.append('image', imageFile);
      }

      if (editMode && currentItem) {
        // Update
        if (tabValue === 0) {
          await tourismApi.updateAttraction(currentItem.id, submitData);
        } else if (tabValue === 1) {
          await tourismApi.updateEvent(currentItem.id, submitData);
        } else {
          await tourismApi.updateSeasonalRecommendation(currentItem.id, submitData);
        }
        setSuccess('更新しました');
      } else {
        // Create
        if (tabValue === 0) {
          await tourismApi.createAttraction(submitData);
        } else if (tabValue === 1) {
          await tourismApi.createEvent(submitData);
        } else {
          await tourismApi.createSeasonalRecommendation(submitData);
        }
        setSuccess('登録しました');
      }
      
      handleCloseDialog();
      loadData();
    } catch (err) {
      setError('保存に失敗しました: ' + (err.response?.data?.detail || err.message));
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('本当に削除しますか？')) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      if (tabValue === 0) {
        await tourismApi.deleteAttraction(id);
      } else if (tabValue === 1) {
        await tourismApi.deleteEvent(id);
      } else {
        await tourismApi.deleteSeasonalRecommendation(id);
      }
      setSuccess('削除しました');
      loadData();
    } catch (err) {
      setError('削除に失敗しました');
      console.error(err);
    }
  };

  const renderAttractionForm = () => (
    <>
      <TextField
        fullWidth
        label="施設名"
        name="name"
        value={formData.name || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        select
        label="カテゴリー"
        name="category"
        value={formData.category || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      >
        {CATEGORY_OPTIONS.map(option => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth
        multiline
        rows={4}
        label="説明"
        name="description"
        value={formData.description || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        label="住所"
        name="address"
        value={formData.address || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          label="緯度"
          name="latitude"
          type="number"
          value={formData.latitude || ''}
          onChange={handleInputChange}
          margin="normal"
          inputProps={{ step: "0.000001" }}
        />
        <TextField
          fullWidth
          label="経度"
          name="longitude"
          type="number"
          value={formData.longitude || ''}
          onChange={handleInputChange}
          margin="normal"
          inputProps={{ step: "0.000001" }}
        />
      </Box>
      <TextField
        fullWidth
        label="電話番号"
        name="phone_number"
        value={formData.phone_number || ''}
        onChange={handleInputChange}
        margin="normal"
      />
      <TextField
        fullWidth
        label="ウェブサイトURL"
        name="website_url"
        value={formData.website_url || ''}
        onChange={handleInputChange}
        margin="normal"
      />
      <TextField
        fullWidth
        label="営業時間"
        name="opening_hours"
        value={formData.opening_hours || ''}
        onChange={handleInputChange}
        margin="normal"
        helperText="例: 9:00-17:00 (休館日: 月曜日)"
      />
      <TextField
        fullWidth
        label="入場料"
        name="admission_fee"
        value={formData.admission_fee || ''}
        onChange={handleInputChange}
        margin="normal"
        helperText="例: 大人500円、子供300円"
      />
      <TextField
        fullWidth
        multiline
        rows={2}
        label="アクセス情報"
        name="access_info"
        value={formData.access_info || ''}
        onChange={handleInputChange}
        margin="normal"
      />
    </>
  );

  const renderEventForm = () => (
    <>
      <TextField
        fullWidth
        label="イベント名"
        name="name"
        value={formData.name || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        select
        label="イベント種別"
        name="event_type"
        value={formData.event_type || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      >
        {EVENT_TYPE_OPTIONS.map(option => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth
        multiline
        rows={4}
        label="説明"
        name="description"
        value={formData.description || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        label="開催場所"
        name="venue"
        value={formData.venue || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        label="住所"
        name="address"
        value={formData.address || ''}
        onChange={handleInputChange}
        margin="normal"
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          label="開始日"
          name="start_date"
          type="date"
          value={formData.start_date || ''}
          onChange={handleInputChange}
          required
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="終了日"
          name="end_date"
          type="date"
          value={formData.end_date || ''}
          onChange={handleInputChange}
          required
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          label="開始時刻"
          name="start_time"
          type="time"
          value={formData.start_time || ''}
          onChange={handleInputChange}
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="終了時刻"
          name="end_time"
          type="time"
          value={formData.end_time || ''}
          onChange={handleInputChange}
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
      </Box>
      <FormControlLabel
        control={
          <Switch
            checked={formData.is_recurring || false}
            onChange={handleInputChange}
            name="is_recurring"
          />
        }
        label="毎年開催"
      />
      <TextField
        fullWidth
        label="問い合わせ先"
        name="contact_info"
        value={formData.contact_info || ''}
        onChange={handleInputChange}
        margin="normal"
      />
      <TextField
        fullWidth
        label="公式サイトURL"
        name="website_url"
        value={formData.website_url || ''}
        onChange={handleInputChange}
        margin="normal"
      />
      <TextField
        fullWidth
        label="参加費"
        name="admission_fee"
        value={formData.admission_fee || ''}
        onChange={handleInputChange}
        margin="normal"
        helperText="例: 無料、1000円など"
      />
    </>
  );

  const renderSeasonalForm = () => (
    <>
      <TextField
        fullWidth
        select
        label="季節"
        name="season"
        value={formData.season || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      >
        {SEASON_OPTIONS.map(option => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth
        label="タイトル"
        name="title"
        value={formData.title || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        multiline
        rows={4}
        label="説明"
        name="description"
        value={formData.description || ''}
        onChange={handleInputChange}
        required
        margin="normal"
      />
    </>
  );

  const renderDialog = () => (
    <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
      <DialogTitle>
        {editMode ? '編集' : '新規登録'} - {
          tabValue === 0 ? '観光施設' :
          tabValue === 1 ? 'イベント' : '季節のおすすめ'
        }
      </DialogTitle>
      <DialogContent>
        {tabValue === 0 && renderAttractionForm()}
        {tabValue === 1 && renderEventForm()}
        {tabValue === 2 && renderSeasonalForm()}
        
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<ImageIcon />}
          >
            画像を選択
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageChange}
            />
          </Button>
          {imageFile && (
            <Typography variant="caption" sx={{ ml: 2 }}>
              {imageFile.name}
            </Typography>
          )}
        </Box>
        
        <TextField
          fullWidth
          label="表示順"
          name="display_order"
          type="number"
          value={formData.display_order || 0}
          onChange={handleInputChange}
          margin="normal"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active !== false}
              onChange={handleInputChange}
              name="is_active"
            />
          }
          label="公開中"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>キャンセル</Button>
        <Button onClick={handleSubmit} variant="contained">
          {editMode ? '更新' : '登録'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderAttractionsTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>施設名</TableCell>
            <TableCell>カテゴリー</TableCell>
            <TableCell>住所</TableCell>
            <TableCell>公開</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {attractions.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>
                <Chip label={item.category_display} size="small" />
              </TableCell>
              <TableCell>{item.address}</TableCell>
              <TableCell>
                {item.is_active ? (
                  <Chip label="公開" color="success" size="small" />
                ) : (
                  <Chip label="非公開" color="default" size="small" />
                )}
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog(item)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(item.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderEventsTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>イベント名</TableCell>
            <TableCell>種別</TableCell>
            <TableCell>開催期間</TableCell>
            <TableCell>場所</TableCell>
            <TableCell>公開</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>
                <Chip label={item.event_type_display} size="small" color="secondary" />
              </TableCell>
              <TableCell>{item.start_date} 〜 {item.end_date}</TableCell>
              <TableCell>{item.venue}</TableCell>
              <TableCell>
                {item.is_active ? (
                  <Chip label="公開" color="success" size="small" />
                ) : (
                  <Chip label="非公開" color="default" size="small" />
                )}
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog(item)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(item.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderSeasonalTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>タイトル</TableCell>
            <TableCell>季節</TableCell>
            <TableCell>公開</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {seasonalRecommendations.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.title}</TableCell>
              <TableCell>
                <Chip label={item.season_display} size="small" color="info" />
              </TableCell>
              <TableCell>
                {item.is_active ? (
                  <Chip label="公開" color="success" size="small" />
                ) : (
                  <Chip label="非公開" color="default" size="small" />
                )}
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog(item)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(item.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          観光情報管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新規登録
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="観光施設" />
          <Tab label="イベント" />
          <Tab label="季節のおすすめ" />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tabValue === 0 && renderAttractionsTable()}
          {tabValue === 1 && renderEventsTable()}
          {tabValue === 2 && renderSeasonalTable()}
        </>
      )}

      {renderDialog()}
    </Container>
  );
}

export default TourismManagement;
