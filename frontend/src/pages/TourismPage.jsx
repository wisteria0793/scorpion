import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Place as PlaceIcon,
  Event as EventIcon,
  Info as InfoIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  AccessTime as AccessTimeIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import tourismApi from '../services/tourismApi';

const CATEGORY_LABELS = {
  HISTORIC: '歴史的建造物',
  NATURE: '自然・景観',
  MUSEUM: '博物館・美術館',
  SHOPPING: 'ショッピング',
  HOT_SPRING: '温泉',
  FOOD: 'グルメ・市場',
  OTHER: 'その他',
};

const EVENT_TYPE_LABELS = {
  FESTIVAL: '祭り',
  SEASONAL: '季節イベント',
  CULTURAL: '文化イベント',
  SPORTS: 'スポーツイベント',
  MARKET: '市場・マルシェ',
  OTHER: 'その他',
};

function TourismPage() {
  const [tabValue, setTabValue] = useState(0);
  const [attractions, setAttractions] = useState([]);
  const [events, setEvents] = useState([]);
  const [seasonalRecommendations, setSeasonalRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    loadData();
  }, [tabValue, filterCategory]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tabValue === 0) {
        const params = filterCategory ? { category: filterCategory } : {};
        const data = await tourismApi.getAttractions(params);
        setAttractions(data);
      } else if (tabValue === 1) {
        const data = await tourismApi.getUpcomingEvents();
        setEvents(data);
      } else if (tabValue === 2) {
        const data = await tourismApi.getCurrentSeasonRecommendations();
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
    setFilterCategory('');
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedItem(null);
  };

  const renderAttractionCard = (attraction) => (
    <Grid item xs={12} sm={6} md={4} key={attraction.id}>
      <Card 
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
        onClick={() => handleItemClick(attraction)}
      >
        {attraction.image && (
          <CardMedia
            component="img"
            height="200"
            image={attraction.image}
            alt={attraction.name}
          />
        )}
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>
            {attraction.name}
          </Typography>
          <Chip 
            label={attraction.category_display} 
            size="small" 
            color="primary" 
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {attraction.description.substring(0, 100)}...
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PlaceIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {attraction.address}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderEventCard = (event) => (
    <Grid item xs={12} sm={6} md={4} key={event.id}>
      <Card 
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
        onClick={() => handleItemClick(event)}
      >
        {event.image && (
          <CardMedia
            component="img"
            height="200"
            image={event.image}
            alt={event.name}
          />
        )}
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>
            {event.name}
          </Typography>
          <Chip 
            label={event.event_type_display} 
            size="small" 
            color="secondary" 
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {event.description.substring(0, 100)}...
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <EventIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {event.start_date} 〜 {event.end_date}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PlaceIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {event.venue}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderSeasonalCard = (recommendation) => (
    <Grid item xs={12} md={6} key={recommendation.id}>
      <Card sx={{ display: 'flex', flexDirection: 'column' }}>
        {recommendation.image && (
          <CardMedia
            component="img"
            height="250"
            image={recommendation.image}
            alt={recommendation.title}
          />
        )}
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip label={recommendation.season_display} color="info" />
            <Typography variant="h5">{recommendation.title}</Typography>
          </Box>
          <Typography variant="body1" paragraph>
            {recommendation.description}
          </Typography>
          
          {recommendation.related_attractions?.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                おすすめ観光施設:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {recommendation.related_attractions.map(attr => (
                  <Chip 
                    key={attr.id} 
                    label={attr.name} 
                    size="small" 
                    variant="outlined"
                    onClick={() => handleItemClick(attr)}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {recommendation.related_events?.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                関連イベント:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {recommendation.related_events.map(evt => (
                  <Chip 
                    key={evt.id} 
                    label={evt.name} 
                    size="small" 
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleItemClick(evt)}
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  const renderDetailDialog = () => {
    if (!selectedItem) return null;

    const isAttraction = selectedItem.category !== undefined;
    const isEvent = selectedItem.event_type !== undefined;

    return (
      <Dialog open={detailOpen} onClose={handleDetailClose} maxWidth="md" fullWidth>
        <DialogTitle>{selectedItem.name || selectedItem.title}</DialogTitle>
        <DialogContent>
          {selectedItem.image && (
            <Box sx={{ mb: 2 }}>
              <img 
                src={selectedItem.image} 
                alt={selectedItem.name || selectedItem.title}
                style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }}
              />
            </Box>
          )}
          
          <Typography variant="body1" paragraph>
            {selectedItem.description}
          </Typography>

          {isAttraction && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PlaceIcon color="action" />
                <Typography variant="body2">{selectedItem.address}</Typography>
              </Box>
              
              {selectedItem.phone_number && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PhoneIcon color="action" />
                  <Typography variant="body2">{selectedItem.phone_number}</Typography>
                </Box>
              )}
              
              {selectedItem.website_url && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LanguageIcon color="action" />
                  <Typography 
                    variant="body2" 
                    component="a" 
                    href={selectedItem.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    公式サイト
                  </Typography>
                </Box>
              )}
              
              {selectedItem.opening_hours && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccessTimeIcon color="action" />
                  <Typography variant="body2">{selectedItem.opening_hours}</Typography>
                </Box>
              )}
              
              {selectedItem.admission_fee && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <MoneyIcon color="action" />
                  <Typography variant="body2">{selectedItem.admission_fee}</Typography>
                </Box>
              )}
              
              {selectedItem.access_info && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>アクセス:</Typography>
                  <Typography variant="body2">{selectedItem.access_info}</Typography>
                </Box>
              )}
            </>
          )}

          {isEvent && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EventIcon color="action" />
                <Typography variant="body2">
                  {selectedItem.start_date} 〜 {selectedItem.end_date}
                </Typography>
              </Box>
              
              {selectedItem.start_time && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccessTimeIcon color="action" />
                  <Typography variant="body2">
                    {selectedItem.start_time} 〜 {selectedItem.end_time}
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PlaceIcon color="action" />
                <Typography variant="body2">{selectedItem.venue}</Typography>
              </Box>
              
              {selectedItem.contact_info && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <InfoIcon color="action" />
                  <Typography variant="body2">{selectedItem.contact_info}</Typography>
                </Box>
              )}
              
              {selectedItem.admission_fee && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <MoneyIcon color="action" />
                  <Typography variant="body2">{selectedItem.admission_fee}</Typography>
                </Box>
              )}
              
              {selectedItem.website_url && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LanguageIcon color="action" />
                  <Typography 
                    variant="body2" 
                    component="a" 
                    href={selectedItem.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    公式サイト
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailClose}>閉じる</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        函館観光情報
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="観光施設" />
          <Tab label="イベント" />
          <Tab label="季節のおすすめ" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box sx={{ mb: 2 }}>
          <TextField
            select
            label="カテゴリーで絞り込み"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">すべて</MenuItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {tabValue === 0 && attractions.map(renderAttractionCard)}
          {tabValue === 1 && events.map(renderEventCard)}
          {tabValue === 2 && seasonalRecommendations.map(renderSeasonalCard)}
          
          {tabValue === 0 && attractions.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body1" color="text.secondary" align="center">
                観光施設が登録されていません
              </Typography>
            </Grid>
          )}
          {tabValue === 1 && events.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body1" color="text.secondary" align="center">
                開催予定のイベントがありません
              </Typography>
            </Grid>
          )}
          {tabValue === 2 && seasonalRecommendations.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body1" color="text.secondary" align="center">
                現在の季節のおすすめ情報がありません
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      {renderDetailDialog()}
    </Container>
  );
}

export default TourismPage;
