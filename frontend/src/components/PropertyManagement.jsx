// src/components/PropertyManagement.jsx
import React, { useState, useEffect } from 'react';
import { getProperties, createProperty, updateProperty, deleteProperty } from '../services/propertyApi';
import './PropertyManagement.css';

const PropertyForm = ({ property, onSave, onCancel }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        setFormData(property || {
            name: '',
            slug: '',
            beds24_property_key: '',
            management_type: '',
        });
    }, [property]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                    {/* Add other fields from the Property model as needed */}
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

    return (
        <div className="property-management">
            <h1>施設管理</h1>
            <button className="btn-primary" onClick={handleCreate}>新しい施設を登録</button>
            
            {loading && <p>読み込み中...</p>}
            {error && <p className="error">{error}</p>}

            {!loading && !error && (
                <table className="property-table">
                    <thead>
                        <tr>
                            <th>施設名</th>
                            <th>管理形態</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {properties.map(prop => (
                            <tr key={prop.id}>
                                <td>{prop.name}</td>
                                <td>{prop.management_type}</td>
                                <td>
                                    <button onClick={() => handleEdit(prop)}>編集</button>
                                    <button className="btn-danger" onClick={() => handleDelete(prop.id)}>削除</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {isFormOpen && (
                <PropertyForm 
                    property={editingProperty}
                    onSave={handleSave}
                    onCancel={() => { setIsFormOpen(false); setEditingProperty(null); }}
                />
            )}
        </div>
    );
}

export default PropertyManagement;
