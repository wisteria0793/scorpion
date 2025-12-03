// frontend/src/components/FormField.jsx
import React from 'react';

export default function FormField({ field, value, onChange }) {
  const { label, field_type, options, is_required } = field;
  const name = label; // 簡易的にlabelをnameとして使用

  switch (field_type) {
    case 'textarea':
      return (
        <div className="form-field-wrapper">
          <label>{label}{is_required && '*'}</label>
          <textarea name={name} value={value} onChange={onChange} required={is_required} className="form-field-textarea" />
        </div>
      );
    case 'radio':
      return (
        <div className="form-field-wrapper">
          <label>{label}{is_required && '*'}</label>
          {options && options.map(opt => (
            <label key={opt} className="form-field-radio-label">
              <input type="radio" name={name} value={opt} onChange={onChange} required={is_required} checked={value === opt} />
              {opt}
            </label>
          ))}
        </div>
      );
    case 'file':
      return (
        <div className="form-field-wrapper">
          <label>{label}{is_required && '*'}</label>
          <input type="file" name={name} onChange={onChange} required={is_required} className="form-field-file" />
        </div>
      );
    case 'date':
      return (
        <div className="form-field-wrapper">
          <label>{label}{is_required && '*'}</label>
          <input type="date" name={name} value={value} onChange={onChange} required={is_required} className="form-field-date" />
        </div>
      );
    case 'number':
      return (
        <div className="form-field-wrapper">
          <label>{label}{is_required && '*'}</label>
          <input type="number" name={name} value={value} onChange={onChange} required={is_required} className="form-field-number" />
        </div>
      );
    case 'email':
      return (
        <div className="form-field-wrapper">
          <label>{label}{is_required && '*'}</label>
          <input type="email" name={name} value={value} onChange={onChange} required={is_required} className="form-field-email" />
        </div>
      );
    case 'text':
    default:
      return (
        <div className="form-field-wrapper">
          <label>{label}{is_required && '*'}</label>
          <input type="text" name={name} value={value} onChange={onChange} required={is_required} className="form-field-text" />
        </div>
      );
  }
}
