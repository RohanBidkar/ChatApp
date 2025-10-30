import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './UserSearch.css';

const UserSearch = ({ onClose, onUserSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('search'); // search, online, contacts
  
  const { searchUsers, getOnlineUsers, getContacts } = useAuth();
  const { startPrivateChat } = useSocket();

  // Load initial data
  useEffect(() => {
    loadOnlineUsers();
    loadContacts();
  }, []);

  const loadOnlineUsers = async () => {
    try {
      const users = await getOnlineUsers();
      setOnlineUsers(users);
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const userContacts = await getContacts();
      setContacts(userContacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      setError('Failed to search users. Please try again.');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      handleSearch(query);
    }, 300);
  };

  const handleUserClick = (user) => {
    startPrivateChat(user.username);
    if (onUserSelect) {
      onUserSelect(user);
    }
    onClose();
  };

  const UserList = ({ users, emptyMessage }) => (
    <div className="user-list">
      {users.length === 0 ? (
        <div className="empty-state">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        users.map(user => (
          <div
            key={user._id}
            className="user-item"
            onClick={() => handleUserClick(user)}
          >
            <div className="user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <span>{user.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{user.username}</span>
              <span className={`user-status ${user.isOnline ? 'online' : 'offline'}`}>
                {user.isOnline ? 'Online' : `Last seen ${new Date(user.lastSeen).toLocaleDateString()}`}
              </span>
            </div>
            {user.isOnline && <div className="online-indicator"></div>}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="user-search-overlay">
      <div className="user-search-modal">
        <div className="user-search-header">
          <h3>Find Users</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="user-search-tabs">
          <button
            className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Search
          </button>
          <button
            className={`tab-button ${activeTab === 'online' ? 'active' : ''}`}
            onClick={() => setActiveTab('online')}
          >
            🟢 Online ({onlineUsers.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            👥 Contacts ({contacts.length})
          </button>
        </div>

        <div className="user-search-content">
          {activeTab === 'search' && (
            <div className="search-tab">
              <div className="search-input-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Type username to search..."
                  className="search-input"
                />
                {loading && <div className="search-spinner"></div>}
              </div>
              
              {error && (
                <div className="error-message">{error}</div>
              )}

              <UserList 
                users={searchResults} 
                emptyMessage={searchQuery ? "No users found matching your search" : "Start typing to search for users"}
              />
            </div>
          )}

          {activeTab === 'online' && (
            <UserList 
              users={onlineUsers} 
              emptyMessage="No other users are currently online"
            />
          )}

          {activeTab === 'contacts' && (
            <UserList 
              users={contacts} 
              emptyMessage="No previous conversations. Start a new chat by searching for users!"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;