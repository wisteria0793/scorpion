import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx'; // メインのレイアウトコンポーネント
import CheckInPage from './pages/CheckInPage';
import GuestFormPage from './pages/GuestFormPage';
import RevenuePage from './pages/RevenuePage'; // 追加
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
    path: '/guest-forms/:token', // フォームページのルート
    element: <GuestFormPage />,
  },
  {
    path: '/revenue', // 売上レポートページのルートを追加
    element: <RevenuePage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
