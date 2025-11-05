import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Loader } from './common';
import './ModernAuth.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate input
      if (!username.trim()) {
        throw new Error('Please enter a username');
      }
      if (!password.trim()) {
        throw new Error('Please enter a password');
      }

      // Convert username to proper email format for Firebase
      let email;
      if (username.includes('@')) {
        // If user entered email directly, use it
        email = username.trim();
      } else {
        // Convert username to email format
        email = `${username.trim()}@admin.com`;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('User logged in successfully:', userCredential.user.email);
      // User will be automatically redirected to dashboard by AuthContext
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'Login failed';
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format. Please check your username.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please check your username.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-auth-container">
      <div className="auth-left-panel">
        <div className="logo-container">
          <img 
            src="/src/assets/images/login-logo.png" 
            alt="Login Logo" 
            className="login-logo"
          />
        </div>

        <div className="auth-content">
          <div className="auth-header">
            <h1 className="typewriter">जयंत पाटील</h1>
            <p>साहेबांचा खरा निष्ठावंत</p>
          </div>

          <form onSubmit={handleSubmit} className="modern-auth-form" style={{position: 'relative'}}>
            {loading && (
              <div className="form-loading-overlay">
                <Loader 
                  size="medium" 
                  color="primary" 
                  text="साइन इन हो रहे हैं..." 
                />
              </div>
            )}
            <div className="form-group">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or email"
                required
                className="modern-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Admin password"
                  required
                  className="modern-input password-field"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className={`sign-in-btn ${loading ? 'loading-btn' : ''}`} 
              disabled={loading}
            >
              {loading ? '' : 'Sign In'}
            </button>

          </form>
        </div>
      </div>

      <div className="auth-right-panel">
        <div className="image-container">
          <img 
            src="/images/hero-img.png" 
            alt="Hero Illustration" 
            className="login-image"
          />
        </div>
      </div>
    </div>
  );
}

export default Login;