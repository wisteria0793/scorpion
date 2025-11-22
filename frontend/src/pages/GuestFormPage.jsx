// frontend/src/pages/GuestFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFormDefinition, submitGuestForm } from '../services/guestFormsApi';
import FormField from '../components/FormField'; // FormFieldコンポーネントをインポート

export default function GuestFormPage() {
  const { token } = useParams();
  const [formDef, setFormDef] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await getFormDefinition(token);
        setFormDef(response.data);
      } catch (err) {
        setError('フォームの読み込みに失敗しました。URLが無効か、期限切れの可能性があります。');
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [token]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const submissionData = new FormData();
    for (const key in formData) {
      submissionData.append(key, formData[key]);
    }

    try {
      await submitGuestForm(token, submissionData);
      setSuccess(true);
    } catch (err) {
      setError('提出に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (success) return <h1>ご提出ありがとうございました。</h1>;
  if (!formDef) return null;

  return (
    <div>
      <h1>{formDef.name}</h1>
      <form onSubmit={handleSubmit}>
        {formDef.fields.map((field) => (
          <FormField 
            key={field.label} 
            field={field} 
            value={formData[field.label] || ''} // 現在の値
            onChange={handleChange} 
          />
        ))}
        <button type="submit" disabled={submitting}>
          {submitting ? '送信中...' : '提出する'}
        </button>
      </form>
    </div>
  );
}
