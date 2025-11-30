import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App.jsx'; // メインのレイアウトコンポーネント
import CheckInPage from './pages/CheckInPage';
import GuestFormPage from './pages/GuestFormPage';
import RevenuePage from './pages/RevenuePage'; // 追加
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './index.css';

    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
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
    element: (
      <RequireAuth>
        <RevenuePage />
      </RequireAuth>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
