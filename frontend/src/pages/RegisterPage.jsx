import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const { register: registerAction } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError('Passwords do not match');
      return;
    }
    try {
      await registerAction({ username, email, password, password2 });
      navigate('/login');
    } catch (err) {
      setError(err?.response?.data || 'Registration failed');
    }
  };

  return (
    <div className="auth-page">
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div>
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label>Confirm Password</label>
          <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </div>
        {error && <div className="error">{JSON.stringify(error)}</div>}
        <button type="submit">Create account</button>
      </form>
    </div>
  );
}
