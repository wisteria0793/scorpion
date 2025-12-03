import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import CheckInPage from './pages/CheckInPage';
import GuestFormPage from './pages/GuestFormPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PropertyFormPage from './pages/PropertyFormPage';
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
  {
    path: '/property/new',
    element: (
      <RequireAuth>
        <PropertyFormPage />
      </RequireAuth>
    ),
  },
  {
    path: '/property/:id/edit',
    element: (
      <RequireAuth>
        <PropertyFormPage />
      </RequireAuth>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
