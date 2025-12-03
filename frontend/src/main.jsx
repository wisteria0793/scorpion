import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import CheckInPage from './pages/CheckInPage';
import GuestFormPage from './pages/GuestFormPage';
import AnalyticsPage from './pages/AnalyticsPage';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AnalyticsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/check-in/:facilitySlug',
    element: <CheckInPage />,
  },
  {
    path: '/guest-form/:token',
    element: <GuestFormPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
