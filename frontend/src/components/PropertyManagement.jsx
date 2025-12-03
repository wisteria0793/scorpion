// src/components/PropertyManagement.jsx
import React, { useState, useEffect } from 'react';
import { getProperties, createProperty, updateProperty, deleteProperty, getImages, uploadImage, deleteImage } from '../services/propertyApi';
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
        fetchImages();
    }, [property.id]);

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
                </div>
            </div>
        </div>
    );
};


const PropertyForm = ({ property, onSave, onCancel }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        setFormData(property || {
            name: '',
            slug: '',
            beds24_property_key: '',
            management_type: '',
            address: '',
            capacity: 0,
            num_parking: 0,
            google_map_url: '',
            check_in_time: '15:00',
            check_out_time: '10:00',
            description: '',
        });
    }, [property]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{property ? '施設情報の編集' : '新しい施設を登録'}</h2>
                    <span className="close-button" onClick={onCancel}>&times;</span>
                </div>
                <form onSubmit={handleSubmit} className="property-form">
                    <div className="form-group">
                        <label>施設名</label>
                        <input name="name" value={formData.name || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>URL識別子 (slug)</label>
                        <input name="slug" value={formData.slug || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Beds24プロパティキー</label>
                        <input name="beds24_property_key" value={formData.beds24_property_key || ''} onChange={handleChange} />
                    </div>
                     <div className="form-group">
                        <label>管理形態</label>
                        <input name="management_type" value={formData.management_type || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>住所</label>
                        <input name="address" value={formData.address || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>最大収容人数</label>
                        <input type="number" name="capacity" value={formData.capacity || 0} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>駐車台数</label>
                        <input type="number" name="num_parking" value={formData.num_parking || 0} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>チェックイン時刻</label>
                        <input type="time" name="check_in_time" value={formData.check_in_time || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>チェックアウト時刻</label>
                        <input type="time" name="check_out_time" value={formData.check_out_time || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>施設説明</label>
                        <textarea name="description" value={formData.description || ''} onChange={handleChange} rows="4"></textarea>
                    </div>
                    <div className="form-group">
                        <label>Google Map URL</label>
                        <textarea name="google_map_url" value={formData.google_map_url || ''} onChange={handleChange} rows="2"></textarea>
                    </div>
                    <button type="submit" className="btn-primary">保存</button>
                    <button type="button" onClick={onCancel}>キャンセル</button>
                </form>
            </div>
        </div>
    );
};


function PropertyManagement() {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedPropertyForImages, setSelectedPropertyForImages] = useState(null);


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

    const handleSave = async (propertyData) => {
        try {
            if (editingProperty) {
                await updateProperty(editingProperty.id, propertyData);
            } else {
                await createProperty(propertyData);
            }
            loadProperties(); // Refresh list
            setIsFormOpen(false);
            setEditingProperty(null);
        } catch (err) {
            setError('保存に失敗しました。');
            console.error(err);
        }
    };

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

    const handleEdit = (property) => {
        setEditingProperty(property);
        setIsFormOpen(true);
    };

    const handleCreate = () => {
        setEditingProperty(null);
        setIsFormOpen(true);
    };
    
    const handleManageImages = (property) => {
        setSelectedPropertyForImages(property);
        setIsImageModalOpen(true);
    };

    return (
        <div className="property-management">
            <h1>施設管理</h1>
            <button className="btn-primary" onClick={handleCreate}>新しい施設を登録</button>
            
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
                                        <button onClick={() => handleEdit(prop)}>編集</button>
                                        <button onClick={() => handleManageImages(prop)}>画像管理</button>
                                        <button className="btn-danger" onClick={() => handleDelete(prop.id)}>削除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isFormOpen && (
                <PropertyForm 
                    property={editingProperty}
                    onSave={handleSave}
                    onCancel={() => { setIsFormOpen(false); setEditingProperty(null); }}
                />
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
