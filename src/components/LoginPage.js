import React, { useState } from 'react';
import './LoginPage.css';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'admin'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError('');

    // TEMPORARY: Bypass authentication for testing
    let mockUser;
    
    if (activeTab === 'student') {
      // Student login - any email/password works
      mockUser = {
        id: 1,
        username: formData.email,
        email: formData.email,
        first_name: 'Dave',
        last_name: 'Lima',
        role: 'student'
      };
    } else {
      // Admin login - check credentials
      if (formData.email === 'admin@gmail.com' && formData.password === 'admin123') {
        mockUser = {
          id: 2,
          username: 'admin@gmail.com',
          email: 'admin@gmail.com',
          first_name: 'Dr. Maria',
          last_name: 'Santos',
          role: 'admin'
        };
      } else {
        setError('Invalid admin credentials. Use: admin@gmail.com / admin123');
        setIsLoading(false);
        return;
      }
    }

    // Store mock authentication data
    localStorage.setItem('auth_token', 'mock_token_for_testing');
    localStorage.setItem('user_data', JSON.stringify(mockUser));
    
    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }
    
    // Clear any existing errors
    setError('');
    setValidationErrors({});
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
    
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Left Panel - Login Form */}
        <div className="login-form-panel">
          <div className="login-form-content">
            <div className="login-header">
              <div className="logo-container">
                <svg className="portal-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
                  <defs>
                    <style>
                      {`.pin-outline { fill: none; stroke: #1a365d; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
                       .pin-fill { fill: #1a365d; }
                       .grad-cap { fill: #1a365d; }
                       .checkmark { fill: #1a365d; }
                       .ripple { fill: none; stroke: #1a365d; stroke-width: 2; opacity: 0.6; }`}
                    </style>
                  </defs>
                  
                  <path className="pin-outline" d="M50 15 C35 15, 25 25, 25 40 C25 55, 50 80, 50 80 C50 80, 75 55, 75 40 C75 25, 65 15, 50 15 Z"/>
                  <path className="pin-fill" d="M50 18 C38 18, 28 27, 28 40 C28 52, 50 75, 50 75 C50 75, 72 52, 72 40 C72 27, 62 18, 50 18 Z"/>
                  <rect className="grad-cap" x="40" y="30" width="20" height="8" rx="1"/>
                  <rect className="grad-cap" x="38" y="32" width="24" height="2"/>
                  <line className="pin-outline" x1="58" y1="32" x2="62" y2="28"/>
                  <circle className="grad-cap" cx="62" cy="28" r="1.5"/>
                  <path className="checkmark" d="M35 50 L42 57 L52 47" stroke="#1a365d" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle className="ripple" cx="50" cy="75" r="8"/>
                  <circle className="ripple" cx="50" cy="75" r="12"/>
                </svg>
              </div>
              <h1 className="login-title">Student Portal</h1>
            </div>
            
            {/* Tab Navigation */}
            <div className="tab-navigation">
              <button
                className={`tab-button ${activeTab === 'student' ? 'active' : ''}`}
                onClick={() => setActiveTab('student')}
              >
                Student Login
              </button>
              <button
                className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin Login
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label htmlFor="email" className="input-label">Email</label>
                <div className="input-container">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder={activeTab === 'student' ? 'student@gmail.com' : 'admin@gmail.com'}
                    className={`form-input ${validationErrors.email ? 'error' : ''}`}
                    required
                  />
                </div>
                {validationErrors.email && (
                  <div className="field-error">{validationErrors.email}</div>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="password" className="input-label">Password</label>
                <div className="input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`form-input ${validationErrors.password ? 'error' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <div className="field-error">{validationErrors.password}</div>
                )}
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {/* Remember Me */}
              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

          </div>
        </div>

        {/* Right Panel - Welcome Message */}
        <div className="welcome-panel">
          <div className="welcome-content">
            <h2 className="welcome-title">
              Welcome to<br />student portal
            </h2>
            <p className="welcome-subtitle">Login to access your account.</p>
            
            <div className="illustration">
              <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
                {/* Left figure with smartphone */}
                <g opacity="0.6">
                  <circle cx="80" cy="120" r="25" fill="none" stroke="#6c757d" strokeWidth="3"/>
                  <rect x="65" y="100" width="30" height="40" rx="15" fill="none" stroke="#6c757d" strokeWidth="3"/>
                  <rect x="70" y="105" width="20" height="30" rx="10" fill="#6c757d"/>
                  
                  {/* Magnifying glass */}
                  <circle cx="130" cy="110" r="15" fill="none" stroke="#6c757d" strokeWidth="3"/>
                  <line x1="143" y1="123" x2="155" y2="135" stroke="#6c757d" strokeWidth="3"/>
                  
                  {/* Document */}
                  <rect x="170" y="90" width="30" height="40" fill="none" stroke="#6c757d" strokeWidth="2"/>
                  <line x1="175" y1="100" x2="195" y2="100" stroke="#6c757d" strokeWidth="2"/>
                  <line x1="175" y1="105" x2="195" y2="105" stroke="#6c757d" strokeWidth="2"/>
                  <line x1="175" y1="110" x2="190" y2="110" stroke="#6c757d" strokeWidth="2"/>
                  <line x1="175" y1="115" x2="195" y2="115" stroke="#6c757d" strokeWidth="2"/>
                </g>
                
                {/* Right figure with laptop */}
                <g opacity="0.6">
                  <circle cx="220" cy="150" r="25" fill="none" stroke="#6c757d" strokeWidth="3"/>
                  <rect x="205" y="130" width="30" height="40" rx="15" fill="none" stroke="#6c757d" strokeWidth="3"/>
                  
                  {/* Laptop */}
                  <rect x="190" y="145" width="50" height="30" rx="5" fill="none" stroke="#6c757d" strokeWidth="3"/>
                  <rect x="195" y="150" width="40" height="20" rx="3" fill="#6c757d"/>
                  
                  {/* Plant */}
                  <rect x="250" y="140" width="8" height="15" fill="#6c757d"/>
                  <ellipse cx="254" cy="135" rx="12" ry="8" fill="none" stroke="#6c757d" strokeWidth="2"/>
                  <ellipse cx="248" cy="130" rx="10" ry="6" fill="none" stroke="#6c757d" strokeWidth="2"/>
                  <ellipse cx="260" cy="128" rx="8" ry="5" fill="none" stroke="#6c757d" strokeWidth="2"/>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
