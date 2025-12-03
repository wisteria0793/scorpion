// src/pages/PropertyFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProperty, createProperty, updateProperty } from '../services/propertyApi';
import AuthHeader from '../components/AuthHeader';
import '../components/Accordion.css';
import '../components/PropertyManagement.css'; // Reuse form styles

const AccordionSection = ({ title, children, isOpen, setIsOpen }) => {
    return (
        <div className="accordion-section">
            <div className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
                <span>{title}</span>
                <span>{isOpen ? '-' : '+'}</span>
            </div>
            {isOpen && <div className="accordion-content">{children}</div>}
        </div>
    );
};

function PropertyFormPage() {
    const [formData, setFormData] = useState({
        name: '', slug: '', beds24_property_key: '', management_type: '',
        address: '', capacity: 0, num_parking: 0, google_map_url: '',
        check_in_time: '15:00', check_out_time: '10:00', description: '',
        wifi_info: '', house_rules: '', faq: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openSection, setOpenSection] = useState('web'); // 'web' or 'checkin'
    
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    useEffect(() => {
        if (isEditing) {
            getProperty(id)
                .then(response => {
                    setFormData(response.data);
                    setLoading(false);
                })
                .catch(err => {
                    setError('施設情報の取得に失敗しました。');
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [id, isEditing]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) : value }));
    };
    
    // A simple handler for the FAQ JSON field
    const handleFaqChange = (e) => {
         setFormData(prev => ({ ...prev, faq: e.target.value }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        let parsedData = { ...formData };
        try {
            // If FAQ is a string, try to parse it as JSON
            if (typeof parsedData.faq === 'string') {
                 parsedData.faq = JSON.parse(parsedData.faq);
            }
        } catch (jsonError) {
            setError('FAQのJSON形式が正しくありません。例: [{"q": "質問", "a": "回答"}]');
            return;
        }

        try {
            if (isEditing) {
                await updateProperty(id, parsedData);
            } else {
                await createProperty(parsedData);
            }
            navigate('/'); // Navigate to home, which now renders AnalyticsPage
        } catch (err) {
            setError('保存に失敗しました。');
            console.error(err);
        }
    };

    if (loading) return <div>読み込み中...</div>;

    return (
        <div className="app-root">
            <AuthHeader />
            <div className="content-area" style={{padding: 'var(--spacing-lg)'}}>
                <h1>{isEditing ? '施設情報の編集' : '新しい施設を登録'}</h1>
                {error && <p className="error" style={{color: 'red'}}>{error}</p>}
                
                <form onSubmit={handleSubmit} className="property-form">
                    <AccordionSection title="Webページ用情報" isOpen={openSection === 'web'} setIsOpen={() => setOpenSection(openSection === 'web' ? null : 'web')}>
                        <div className="form-group"><label>施設名</label><input name="name" value={formData.name || ''} onChange={handleChange} required /></div>
                        <div className="form-group"><label>URL識別子 (slug)</label><input name="slug" value={formData.slug || ''} onChange={handleChange} required /></div>
                        <div className="form-group"><label>管理形態</label><input name="management_type" value={formData.management_type || ''} onChange={handleChange} /></div>
                        <div className="form-group"><label>住所</label><input name="address" value={formData.address || ''} onChange={handleChange} /></div>
                        <div className="form-group"><label>最大収容人数</label><input type="number" name="capacity" value={formData.capacity || 0} onChange={handleChange} /></div>
                        <div className="form-group"><label>駐車台数</label><input type="number" name="num_parking" value={formData.num_parking || 0} onChange={handleChange} /></div>
                        <div className="form-group"><label>施設説明</label><textarea name="description" value={formData.description || ''} onChange={handleChange} rows="4"></textarea></div>
                        <div className="form-group"><label>Google Map URL</label><textarea name="google_map_url" value={formData.google_map_url || ''} onChange={handleChange} rows="2"></textarea></div>
                    </AccordionSection>

                    <AccordionSection title="チェックインシステム用情報" isOpen={openSection === 'checkin'} setIsOpen={() => setOpenSection(openSection === 'checkin' ? null : 'checkin')}>
                        <div className="form-group"><label>Beds24プロパティキー</label><input name="beds24_property_key" value={formData.beds24_property_key || ''} onChange={handleChange} /></div>
                        <div className="form-group"><label>チェックイン時刻</label><input type="time" name="check_in_time" value={formData.check_in_time || ''} onChange={handleChange} /></div>
                        <div className="form-group"><label>チェックアウト時刻</label><input type="time" name="check_out_time" value={formData.check_out_time || ''} onChange={handleChange} /></div>
                        <div className="form-group"><label>Wi-Fi情報</label><textarea name="wifi_info" value={formData.wifi_info || ''} onChange={handleChange} rows="4"></textarea></div>
                        <div className="form-group"><label>ハウスルール</label><textarea name="house_rules" value={formData.house_rules || ''} onChange={handleChange} rows="8"></textarea></div>
                        <div className="form-group">
                            <label>FAQ (JSON形式)</label>
                            <textarea name="faq" value={typeof formData.faq === 'string' ? formData.faq : JSON.stringify(formData.faq, null, 2)} onChange={handleFaqChange} rows="8"></textarea>
                            <small>例: [{"q": "最寄駅はどこですか？", "a": "JR函館駅です。"}]</small>
                        </div>
                    </AccordionSection>
                    
                    <button type="submit" className="btn-primary" style={{marginTop: 'var(--spacing-md)'}}>保存して戻る</button>
                    <button type="button" onClick={() => navigate('/')} style={{marginLeft: 'var(--spacing-sm)'}}>キャンセル</button>
                </form>
            </div>
        </div>
    );
}

export default PropertyFormPage;