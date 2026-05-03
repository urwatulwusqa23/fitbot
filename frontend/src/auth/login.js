import React, { useState } from 'react';
import { api } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { FaDumbbell, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGithub, FaArrowRight } from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import './auth.css';

export default function Login() {
  // State uses 'username' to match C# UserDto, but we treat it as an email in the UI
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Sends { username: "...", password: "..." } to the backend
      const data = await api.login(formData);
      
      if (data.token) {
        localStorage.setItem('token', data.token);

        // CHECK: Is this a new user?
        // If hasProfile is false, go to the setup popup/page. 
        // Otherwise, go to dashboard.
        if (data.hasProfile === false) {
          navigate('/setup-profile');
        } else {
          navigate('/'); 
        }

      } else {
        setError('Invalid credentials specified.');
      }
    } catch (err) {
      console.error(err);
      setError('Login failed. Please check your credentials or server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      const idToken = credentialResponse?.credential;
      if (!idToken) {
        throw new Error('Google did not return a valid ID token. Please try again.');
      }
      const data = await api.googleLogin(idToken);
      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.hasProfile === false) {
          navigate('/setup-profile');
        } else {
          navigate('/');
        }
      } else {
        setError('Google sign-in could not complete.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Google sign-in failed. Ensure the API is running and CORS allows this origin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed.');
  };

  return (
    <div className="custom-auth-wrapper">
      <div className="custom-auth-logo">
        <FaDumbbell /> FitBot AI
      </div>
      
      <div className="custom-auth-box">
        <h2>Welcome Back</h2>
        <p className="custom-auth-subtitle">Enter your credentials to access your account</p>
        
        {error && (
          <div style={{
            color: '#721c24', 
            backgroundColor: '#f8d7da', 
            borderColor: '#f5c6cb', 
            padding: '10px', 
            borderRadius:'5px', 
            marginBottom:'15px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email/Username Field */}
          <div className="custom-input-group">
            <label>Email Address</label>
            <div className="custom-input-wrapper">
                <FaEnvelope className="custom-input-icon" />
                <input 
                  type="email" 
                  placeholder="you@example.com"
                  // Binds to formData.username to match backend DTO
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
            </div>
          </div>

          {/* Password Field */}
          <div className="custom-input-group">
            <label>Password</label>
            <div className="custom-input-wrapper">
                <FaLock className="custom-input-icon" />
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
                <span className="custom-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
            </div>
          </div>

          <Link to="/forgot-password" className="custom-forgot-pass">Forgot password?</Link>

          <button type="submit" className="custom-auth-btn" disabled={isLoading}>
            {isLoading ? 'Signing In...' : <>Sign In <FaArrowRight /></>}
          </button>
        </form>

        <div className="custom-divider">or continue with</div>

        <div className="custom-social-buttons">
            {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
              <div className="custom-google-btn-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="filled_black"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  width="100%"
                />
              </div>
            ) : (
              <p className="custom-google-setup-hint">Add REACT_APP_GOOGLE_CLIENT_ID to .env for Google sign-in</p>
            )}
            <button type="button" className="custom-social-btn" disabled><FaGithub /> GitHub</button>
        </div>

        <p className="custom-switch-auth">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
      
      <div className="custom-bottom-links">
        By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
      </div>
    </div>
  );
}