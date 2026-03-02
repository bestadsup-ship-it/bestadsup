import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/client';
import '../styles/auth.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.login(email, password);
      navigate('/');
    } catch (err) {
      // Sanitized error logging - never log sensitive data
      console.error('Login failed:', {
        status: err.response?.status,
        code: err.code,
      });

      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.message ||
                          err.message ||
                          'Login failed. Please try again.';

      // Make error messages more user-friendly
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('Unauthorized')) {
        setError('Invalid email or password. Please try again.');
      } else if (errorMessage.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else if (errorMessage.includes('Too many login attempts')) {
        setError('Too many login attempts. Please try again later.');
      } else if (errorMessage.includes('temporarily locked')) {
        setError('Account temporarily locked. Please try again later.');
      } else if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else if (err.response?.status === 423) {
        setError('Account temporarily locked due to multiple failed attempts. Please try again later.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img
            src="/BestAdsUp.jpg"
            alt="BestAdsUp Logo"
            style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '1rem' }}
          />
          <h1>BestAdsUp</h1>
          <h2>Sign In</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
            The SaaS marketing marketplace
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
