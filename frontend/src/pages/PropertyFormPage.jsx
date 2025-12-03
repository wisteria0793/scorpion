// src/pages/PropertyFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProperty, createProperty, updateProperty } from '../services/propertyApi';
import {
    Box, Button, Typography, TextField, Accordion, AccordionSummary, AccordionDetails, 
    CircularProgress, Paper, Grid, IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

function PropertyFormPage() {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    useEffect(() => {
        if (isEditing) {
            getProperty(id)
                .then(response => {
                    // Ensure faq is an array
                    const data = response.data;
                    if (!Array.isArray(data.faq)) {
                        data.faq = [];
                    }
                    setFormData(data);
                    setLoading(false);
                })
                .catch(() => {
                    setError('施設情報の取得に失敗しました。');
                    setLoading(false);
                });
        } else {
            setFormData({
                name: '', slug: '', beds24_property_key: '', management_type: '',
                address: '', capacity: 0, num_parking: 0, google_map_url: '',
                check_in_time: '15:00', check_out_time: '10:00', description: '',
                wifi_info: '', house_rules: '', faq: []
            });
            setLoading(false);
        }
    }, [id, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFaqChange = (index, field, value) => {
        const newFaq = [...formData.faq];
        newFaq[index][field] = value;
        setFormData(prev => ({ ...prev, faq: newFaq }));
    };

    const addFaqItem = () => {
        setFormData(prev => ({ ...prev, faq: [...prev.faq, { q: '', a: '' }] }));
    };

    const removeFaqItem = (index) => {
        const newFaq = formData.faq.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, faq: newFaq }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateProperty(id, formData);
            } else {
                await createProperty(formData);
            }
            navigate('/');
        } catch (err) {
            setError('保存に失敗しました。');
            console.error(err);
        }
    };

    if (loading || !formData) return <CircularProgress />;

    return (
        <Paper sx={{ p: 4, margin: 'auto', maxWidth: 1000 }}>
            <Typography variant="h4" gutterBottom>
                {isEditing ? '施設情報の編集' : '新しい施設を登録'}
            </Typography>
            {error && <Typography color="error">{error}</Typography>}
            
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Webページ用情報</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}><TextField name="name" label="施設名" value={formData.name} onChange={handleChange} fullWidth required /></Grid>
                            <Grid item xs={12} sm={6}><TextField name="slug" label="URL識別子 (slug)" value={formData.slug} onChange={handleChange} fullWidth required /></Grid>
                            <Grid item xs={12}><TextField name="address" label="住所" value={formData.address} onChange={handleChange} fullWidth /></Grid>
                            <Grid item xs={12} sm={6}><TextField name="capacity" label="最大収容人数" type="number" value={formData.capacity} onChange={handleChange} fullWidth /></Grid>
                            <Grid item xs={12} sm={6}><TextField name="num_parking" label="駐車台数" type="number" value={formData.num_parking} onChange={handleChange} fullWidth /></Grid>
                            <Grid item xs={12}><TextField name="description" label="施設説明" value={formData.description} onChange={handleChange} fullWidth multiline rows={4} /></Grid>
                            <Grid item xs={12}><TextField name="google_map_url" label="Google Map URL" value={formData.google_map_url} onChange={handleChange} fullWidth multiline rows={2} /></Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>チェックインシステム用情報</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}><TextField name="beds24_property_key" label="Beds24プロパティキー" value={formData.beds24_property_key} onChange={handleChange} fullWidth /></Grid>
                            <Grid item xs={12} sm={4}><TextField name="check_in_time" label="チェックイン時刻" type="time" value={formData.check_in_time} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} sm={4}><TextField name="check_out_time" label="チェックアウト時刻" type="time" value={formData.check_out_time} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12}><TextField name="wifi_info" label="Wi-Fi情報" value={formData.wifi_info} onChange={handleChange} fullWidth multiline rows={4} /></Grid>
                            <Grid item xs={12}><TextField name="house_rules" label="ハウスルール" value={formData.house_rules} onChange={handleChange} fullWidth multiline rows={8} /></Grid>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>FAQ</Typography>
                                {formData.faq.map((item, index) => (
                                    <Grid container spacing={1} key={index} alignItems="center" sx={{ mb: 1 }}>
                                        <Grid item xs={5}><TextField label={`質問 ${index + 1}`} value={item.q} onChange={(e) => handleFaqChange(index, 'q', e.target.value)} fullWidth /></Grid>
                                        <Grid item xs={5}><TextField label={`回答 ${index + 1}`} value={item.a} onChange={(e) => handleFaqChange(index, 'a', e.target.value)} fullWidth multiline /></Grid>
                                        <Grid item xs={2}><IconButton color="error" onClick={() => removeFaqItem(index)}><DeleteIcon /></IconButton></Grid>
                                    </Grid>
                                ))}
                                <Button startIcon={<AddIcon />} onClick={addFaqItem}>FAQを追加</Button>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>
                
                <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button type="submit" variant="contained" size="large">保存して戻る</Button>
                    <Button variant="outlined" size="large" onClick={() => navigate('/')}>キャンセル</Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default PropertyFormPage;
