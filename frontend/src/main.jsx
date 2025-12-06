import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import DebugReservationsPage from './pages/DebugReservationsPage';
import './index.css';

// New Root component to handle initial authentication check
function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AnalyticsPage />;
}

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
    element: <Root />,
  },
  {
    path: '/debug/reservations',
    element: <DebugReservationsPage />,
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
], { basename: import.meta.env.VITE_BASE_PATH || '/' });

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
