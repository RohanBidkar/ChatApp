import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const { connectUser } = useSocket();
  const { login, register } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result;
      
      if (isLogin) {
        result = await login(formData.username, formData.password);
      } else {
        result = await register(formData.username, formData.password, formData.email);
      }

      if (result.success) {
        // Connect to socket with authenticated user
        connectUser(result.user.username);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (error) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      username: '',
      password: '',
      email: ''
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-icon">⚡</span>
            <h1>InstaTalk</h1>
          </div>
          <p>{isLogin ? 'Sign in to continue' : 'Create your account'}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="input-group">
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter your username..."
              className="auth-input"
              disabled={loading}
              maxLength={20}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password..."
              className="auth-input"
              disabled={loading}
              minLength={6}
              required
            />
          </div>

          {!isLogin && (
            <div className="input-group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email (optional)..."
                className="auth-input"
                disabled={loading}
              />
            </div>
          )}
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading || !formData.username.trim() || !formData.password.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              className="toggle-mode-button"
              onClick={toggleMode}
              disabled={loading}
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </p>
          <div className="feature-list">
            <p>🔒 Secure authentication</p>
            <p>🌟 Private and group chats</p>
            <p>🔍 Search and add users</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;