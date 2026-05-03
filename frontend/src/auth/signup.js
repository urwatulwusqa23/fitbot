import React, { useState } from 'react';
import { api } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { FaDumbbell, FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGithub, FaArrowRight } from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import './auth.css';

const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim());
};

export default function Signup() {
  // Mapping "Full Name" to 'username' for backend compatibility; email for validation only
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, email: value }));
    if (value.trim()) {
      setEmailError(isValidEmail(value) ? '' : 'Please enter a valid email address.');
    } else {
      setEmailError('');
    }
  };

  const handleEmailBlur = () => {
    if (formData.email.trim()) {
      setEmailError(isValidEmail(formData.email) ? '' : 'Please enter a valid email address.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(formData.email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setIsLoading(true);
    try {
      const response = await api.register(formData);
      
      if (response.ok) {
        alert("Account created successfully! Please log in.");
        navigate('/login');
      } else {
        const text = await response.text();
        setError(text || "Registration failed. Try a different username.");
      }
    } catch (err) {
      setError('Server error. Please try again later.');
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
        <h2>Create Account</h2>
        <p className="custom-auth-subtitle">Start your fitness journey with AI</p>

        {error && <div style={{color: '#ff6b6b', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius:'5px', marginBottom:'15px'}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          
          {/* Full Name Field (Mapped to Username) */}
          <div className="custom-input-group">
            <label>Full Name</label>
            <div className="custom-input-wrapper">
                <FaUser className="custom-input-icon" />
                <input 
                  type="text" 
                  placeholder="John Doe"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
            </div>
          </div>

          {/* Email Field */}
          <div className="custom-input-group">
            <label>Email Address</label>
            <div className="custom-input-wrapper">
                <FaEnvelope className="custom-input-icon" />
                <input 
                  type="email" 
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  required
                />
            </div>
            {emailError && (
              <span className="custom-field-error">{emailError}</span>
            )}
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

          <button type="submit" className="custom-auth-btn" disabled={isLoading || !!emailError}>
            {isLoading ? 'Creating Account...' : <>Create Account <FaArrowRight /></>}
          </button>
        </form>

        <div className="custom-divider">or sign up with</div>

        <div className="custom-social-buttons">
            {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
              <div className="custom-google-btn-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="filled_black"
                  size="large"
                  text="signup_with"
                  shape="rectangular"
                  width="100%"
                />
              </div>
            ) : (
              <p className="custom-google-setup-hint">Add REACT_APP_GOOGLE_CLIENT_ID to .env for Google sign-up</p>
            )}
            <button type="button" className="custom-social-btn" disabled><FaGithub /> GitHub</button>
        </div>

        <p className="custom-switch-auth">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>

      <div className="custom-bottom-links">
        By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
      </div>
    </div>
  );
}