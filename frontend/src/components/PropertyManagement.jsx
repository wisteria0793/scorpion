// src/components/PropertyManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties, deleteProperty, getImages, uploadImage, deleteImage } from '../services/propertyApi';
import './PropertyManagement.css';

const ImageManagementModal = ({ property, onClose }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const response = await getImages(property.id);
            setImages(response.data);
        } catch (err) {
            setError('画像の取得に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (property) {
            fetchImages();
        }
    }, [property]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        try {
            await uploadImage(property.id, file);
            await fetchImages(); // Refresh list
        } catch (err) {
            setError('アップロードに失敗しました。');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteImage = async (imageId) => {
        if (window.confirm('この画像を本当に削除しますか？')) {
            try {
                await deleteImage(property.id, imageId);
                await fetchImages(); // Refresh list
            } catch (err) {
                setError('削除に失敗しました。');
            }
        }
    };

    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{property.name} - 画像管理</h2>
                    <span className="close-button" onClick={onClose}>&times;</span>
                </div>
                {error && <p className="error">{error}</p>}
                
                <div className="form-group">
                    <label>新しい画像をアップロード</label>
                    <input type="file" onChange={handleFileChange} disabled={uploading} />
                    {uploading && <p>アップロード中...</p>}
                </div>

                <div className="image-gallery">
                    {loading ? <p>画像読み込み中...</p> : 
                        images.map(img => (
                            <div key={img.id} className="image-thumbnail">
                                <img src={img.image} alt={`Facility image ${img.id}`} />
                                <button className="btn-danger" onClick={() => handleDeleteImage(img.id)}>削除</button>
                            </div>
                        ))
                    }
                     {images.length === 0 && !loading && <p>画像がありません。</p>}
                </div>
            </div>
        </div>
    );
};

function PropertyManagement() {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedPropertyForImages, setSelectedPropertyForImages] = useState(null);
    const navigate = useNavigate();

    const loadProperties = async () => {
        setLoading(true);
        try {
            const response = await getProperties();
            setProperties(response.data);
        } catch (err) {
            setError('施設情報の取得に失敗しました。');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProperties();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('この施設を本当に削除しますか？')) {
            try {
                await deleteProperty(id);
                loadProperties(); // Refresh list
            } catch (err) {
                setError('削除に失敗しました。');
                console.error(err);
            }
        }
    };
    
    const handleManageImages = (property) => {
        setSelectedPropertyForImages(property);
        setIsImageModalOpen(true);
    };

    return (
        <div className="property-management">
            <h1>施設管理</h1>
            <button className="btn-primary" onClick={() => navigate('/property/new')}>新しい施設を登録</button>
            
            {loading && <p>読み込み中...</p>}
            {error && <p className="error">{error}</p>}

            {!loading && !error && (
                <div className="table-container">
                    <table className="property-table">
                        <thead>
                            <tr>
                                <th>施設名</th>
                                <th>住所</th>
                                <th>最大収容人数</th>
                                <th>管理形態</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {properties.map(prop => (
                                <tr key={prop.id}>
                                    <td>{prop.name}</td>
                                    <td>{prop.address}</td>
                                    <td>{prop.capacity}</td>
                                    <td>{prop.management_type}</td>
                                    <td>
                                        <button onClick={() => navigate(`/property/${prop.id}/edit`)}>編集</button>
                                        <button onClick={() => handleManageImages(prop)}>画像管理</button>
                                        <button className="btn-danger" onClick={() => handleDelete(prop.id)}>削除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {isImageModalOpen && (
                <ImageManagementModal
                    property={selectedPropertyForImages}
                    onClose={() => setIsImageModalOpen(false)}
                />
            )}
        </div>
    );
}

export default PropertyManagement;