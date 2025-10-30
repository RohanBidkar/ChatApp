import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 
    (import.meta.env.PROD ? '' : 'http://localhost:3001');

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('chat_token');
    const savedUser = localStorage.getItem('chat_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify token with server
        verifyToken(savedToken);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        clearAuthData();
      }
    }
    setLoading(false);
  }, []);

  // Verify token with server
  const verifyToken = async (tokenToVerify) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.data.user);
        localStorage.setItem('chat_user', JSON.stringify(data.data.user));
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      clearAuthData();
    }
  };

  // Clear authentication data
  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
  };

  // Register new user
  const register = async (username, password, email = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.success) {
        const { user: userData, token: userToken } = data.data;
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('chat_token', userToken);
        localStorage.setItem('chat_user', JSON.stringify(userData));
        return { success: true, user: userData };
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  // Login user
  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success) {
        const { user: userData, token: userToken } = data.data;
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('chat_token', userToken);
        localStorage.setItem('chat_user', JSON.stringify(userData));
        return { success: true, user: userData };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  // Logout user
  const logout = () => {
    clearAuthData();
  };

  // Search users
  const searchUsers = async (query) => {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      return data.success ? data.data.users : [];
    } catch (error) {
      console.error('User search error:', error);
      throw error;
    }
  };

  // Get online users
  const getOnlineUsers = async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/online`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get online users');
      }

      return data.success ? data.data.users : [];
    } catch (error) {
      console.error('Get online users error:', error);
      throw error;
    }
  };

  // Get user contacts
  const getContacts = async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/contacts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get contacts');
      }

      return data.success ? data.data.contacts : [];
    } catch (error) {
      console.error('Get contacts error:', error);
      throw error;
    }
  };

  // Load private chat history
  const loadPrivateMessages = async (otherUserId, page = 1, limit = 50) => {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/private/${otherUserId}?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load messages');
      }

      return data.success ? data.data : { messages: [], pagination: {} };
    } catch (error) {
      console.error('Load private messages error:', error);
      throw error;
    }
  };

  // Load room chat history
  const loadRoomMessages = async (roomId, page = 1, limit = 50) => {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/room/${roomId}?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load room messages');
      }

      return data.success ? data.data : { messages: [], pagination: {} };
    } catch (error) {
      console.error('Load room messages error:', error);
      throw error;
    }
  };

  // Get recent conversations
  const getConversations = async () => {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get conversations');
      }

      return data.success ? data.data.conversations : [];
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    register,
    login,
    logout,
    searchUsers,
    getOnlineUsers,
    getContacts,
    loadPrivateMessages,
    loadRoomMessages,
    getConversations,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;