// src/components/PropertyManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties, deleteProperty, getImages, uploadImage, deleteImage } from '../services/propertyApi';
import { 
    Box, Button, Typography, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, Modal, Card, CardContent, CardActions, IconButton, Grid, CircularProgress 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 600, md: 800 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

const ImageManagementModal = ({ property, onClose }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const response = await getImages(property.id);
            setImages(response.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (property) fetchImages();
    }, [property]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            await uploadImage(property.id, file);
            await fetchImages();
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteImage = async (imageId) => {
        if (window.confirm('この画像を本当に削除しますか？')) {
            try {
                await deleteImage(property.id, imageId);
                await fetchImages();
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <Modal open onClose={onClose}>
            <Box sx={modalStyle}>
                <Typography variant="h6" component="h2" gutterBottom>
                    {property.name} - 画像管理
                </Typography>
                <Button
                    variant="contained"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    disabled={uploading}
                >
                    {uploading ? 'アップロード中...' : '新しい画像をアップロード'}
                    <input type="file" hidden onChange={handleFileChange} />
                </Button>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                    {loading ? <CircularProgress /> : 
                        images.map(img => (
                            <Grid item xs={6} sm={4} key={img.id}>
                                <Card>
                                    <CardContent sx={{ p: 1 }}>
                                        <img src={img.image} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                    </CardContent>
                                    <CardActions>
                                        <IconButton size="small" color="error" onClick={() => handleDeleteImage(img.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))
                    }
                </Grid>
            </Box>
        </Modal>
    );
};

function PropertyManagement() {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedPropertyForImages, setSelectedPropertyForImages] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        getProperties().then(res => {
            setProperties(res.data);
            setLoading(false);
        });
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('この施設を本当に削除しますか？')) {
            await deleteProperty(id);
            setProperties(properties.filter(p => p.id !== id));
        }
    };
    
    const handleManageImages = (property) => {
        setSelectedPropertyForImages(property);
        setIsImageModalOpen(true);
    };

    if (loading) return <CircularProgress />;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">施設管理</Typography>
                <Button variant="contained" onClick={() => navigate('/property/new')}>新しい施設を登録</Button>
            </Box>
            
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>施設名</TableCell>
                            <TableCell>住所</TableCell>
                            <TableCell>最大収容人数</TableCell>
                            <TableCell>管理形態</TableCell>
                            <TableCell align="right">操作</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {properties.map(prop => (
                            <TableRow key={prop.id} hover>
                                <TableCell>{prop.name}</TableCell>
                                <TableCell>{prop.address}</TableCell>
                                <TableCell>{prop.capacity}</TableCell>
                                <TableCell>{prop.management_type}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => navigate(`/property/${prop.id}/edit`)}><EditIcon /></IconButton>
                                    <IconButton size="small" onClick={() => handleManageImages(prop)}><PhotoLibraryIcon /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDelete(prop.id)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            
            {isImageModalOpen && (
                <ImageManagementModal
                    property={selectedPropertyForImages}
                    onClose={() => setIsImageModalOpen(false)}
                />
            )}
        </Box>
    );
}

export default PropertyManagement;
