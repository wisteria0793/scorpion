# 開発手順書: 動的宿泊者名簿機能

## 1. 概要

### 1.1. 目的
本ドキュメントは、「動的宿泊者名簿機能」を実装するための、詳細な手順を定義する。開発者は本手順書に従い、バックエンドからフロントエンドまでの開発作業を行う。

### 1.2. 機能ゴール
- **ゲスト:** 施設ごとに最適化されたURLから、自身の予約情報を簡単な入力（チェックイン日のみ）で検索し、動的に生成されたフォームで宿泊者名簿を提出できる。
- **管理者:** Django管理画面から、施設ごとに異なるフォーム（質問項目、必須設定など）を自由に作成・割り当てができる。提出された内容は管理画面で確認できる。

---

## 2. フェーズ1: バックエンド - データベースと管理画面のセットアップ
(省略)

---

## 3. フェーズ2: バックエンド - APIの実装
(省略)

---

## 4. フェーズ3: フロントエンド - UIとロジックの実装

### 前提
- `axios` でAPI通信を行う (`npm install axios`)
- `react-router-dom` でルーティングを管理する (`npm install react-router-dom`)

### ステップ3.1: API通信層の作成
- **目的:** バックエンドAPIとの通信を担う関数をひとまとめにする。
- **対象ファイル:** `frontend/src/services/guestFormsApi.js` (新規作成)
- **コード:**
  ```javascript
  // frontend/src/services/guestFormsApi.js
  import axios from 'axios';

  // DjangoサーバーのベースURLを設定
  const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api', // 環境に応じて変更
    headers: {
      'Content-Type': 'application/json',
    },
  });

  export const lookupReservation = (facilitySlug, checkInDate) => {
    return apiClient.post(`/check-in/${facilitySlug}/`, {
      check_in_date: checkInDate,
    });
  };

  export const getFormDefinition = (token) => {
    return apiClient.get(`/guest-forms/${token}/`);
  };

  export const submitGuestForm = (token, formData) => {
    return apiClient.post(`/guest-forms/${token}/submit/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // ファイルアップロードのため
      },
    });
  };
  ```

### ステップ3.2: ルーティングの設定
- **目的:** ゲストがアクセスするURLと、表示するReactコンポーネントを紐付ける。
- **対象ファイル:** `frontend/src/main.jsx` (または `App.jsx` など、ルーティングの起点となるファイル)
- **コード:**
  ```jsx
  // frontend/src/main.jsx
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import { createBrowserRouter, RouterProvider } from 'react-router-dom';
  import App from './App'; // メインのレイアウトコンポーネント
  import CheckInPage from './pages/CheckInPage';
  import GuestFormPage from './pages/GuestFormPage';
  import './index.css';

  const router = createBrowserRouter([
    {
      path: '/',
      element: <App />,
      // 他の既存ルート...
    },
    {
      path: '/check-in/:facilitySlug', // 予約検索ページのルート
      element: <CheckInPage />,
    },
    {
      path: '/guest-form/:token', // フォームページのルート
      element: <GuestFormPage />,
    },
  ]);

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
  ```

### ステップ3.3: 予約検索ページの作成
- **目的:** ゲストがチェックイン日を入力するページを作成する。
- **対象ファイル:** `frontend/src/pages/CheckInPage.jsx` (新規作成)
- **コード:**
  ```jsx
  // frontend/src/pages/CheckInPage.jsx
  import React, { useState } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import { lookupReservation } from '../services/guestFormsApi';

  export default function CheckInPage() {
    const { facilitySlug } = useParams();
    const navigate = useNavigate();
    const [checkInDate, setCheckInDate] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
        const response = await lookupReservation(facilitySlug, checkInDate);
        const { token } = response.data;
        navigate(`/guest-form/${token}`);
      } catch (err) {
        setError('予約が見つかりませんでした。日付を確認して再度お試しください。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div>
        <h1>ご予約の確認</h1>
        <p>チェックイン日を入力してください。</p>
        <form onSubmit={handleSubmit}>
          <input
            type="date"
            value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? '検索中...' : '次へ'}
          </button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }
  ```

### ステップ3.4: 動的フォームページの作成
- **目的:** APIから取得した定義に基づき、フォームを動的に生成・表示する。
- **対象ファイル:** `frontend/src/pages/GuestFormPage.jsx` (新規作成)
- **コード:**
  ```jsx
  // frontend/src/pages/GuestFormPage.jsx
  import React, { useState, useEffect } from 'react';
  import { useParams } from 'react-router-dom';
  import { getFormDefinition, submitGuestForm } from '../services/guestFormsApi';

  // 個々のフォーム部品を描画するコンポーネント (ステップ3.5で作成)
  // import FormField from '../components/FormField'; 

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
            <div key={field.label}>
              <label>{field.label}{field.is_required && '*'}</label>
              {/* 本来は専用コンポーネントを使うが、ここでは簡易的に実装 */}
              <input 
                type={field.field_type} 
                name={field.label} // nameは一意なものにする必要あり
                onChange={handleChange}
                required={field.is_required}
              />
            </div>
          ))}
          <button type="submit" disabled={submitting}>
            {submitting ? '送信中...' : '提出する'}
          </button>
        </form>
      </div>
    );
  }
  ```
- **補足:** 上記コードでは簡易的に`input`を直接使っていますが、実際には次のステップで作成する専用コンポーネントを呼び出す形が理想的です。

### ステップ3.5: 動的フィールドコンポーネントの作成 (推奨)
- **目的:** `field_type`に応じて適切な入力欄を描画する部品を作成し、フォームの可読性と保守性を高める。
- **対象ファイル:** `frontend/src/components/FormField.jsx` (新規作成)
- **コード:**
  ```jsx
  // frontend/src/components/FormField.jsx
  import React from 'react';

  export default function FormField({ field, value, onChange }) {
    const { label, field_type, options, is_required } = field;
    const name = label; // 簡易的にlabelをnameとして使用

    switch (field_type) {
      case 'textarea':
        return (
          <div>
            <label>{label}{is_required && '*'}</label>
            <textarea name={name} value={value} onChange={onChange} required={is_required} />
          </div>
        );
      case 'radio':
        return (
          <div>
            <label>{label}{is_required && '*'}</label>
            {options.map(opt => (
              <label key={opt}>
                <input type="radio" name={name} value={opt} onChange={onChange} required={is_required} />
                {opt}
              </label>
            ))}
          </div>
        );
      // 他のfield_type（date, number, fileなど）のcaseも同様に作成
      case 'text':
      case 'email':
      default:
        return (
          <div>
            <label>{label}{is_required && '*'}</label>
            <input type={field_type} name={name} value={value} onChange={onChange} required={is_required} />
          </div>
        );
    }
  }
  ```
- **`GuestFormPage.jsx`の修正:** 上記コンポーネントを使う場合、`map`の中身を`<FormField field={field} ... />`のように書き換えます。
