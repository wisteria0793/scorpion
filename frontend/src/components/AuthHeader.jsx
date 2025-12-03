import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthHeader() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(e) {
    e.preventDefault();
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  }

  return (
    <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #eee' }}>
      <div className="brand">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <strong>Scorpion</strong>
        </Link>
      </div>

      <div className="auth-controls">
        {loading ? (
          <span>Loading...</span>
        ) : user ? (
          <>
            <span style={{ marginRight: 12 }}>Hi, {user.username}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ marginRight: 8 }}>Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}
