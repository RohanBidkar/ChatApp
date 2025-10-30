import './UserList.css';

const UserList = ({ users, selectedUser, onUserSelect, privateChatUsers, recentConversations = [] }) => {
  
  // Helper function to handle user selection
  const handleUserClick = (user) => {
    onUserSelect({
      userId: user.userId || user.socketId,
      dbUserId: user.dbUserId || user.userId,
      username: user.username,
      isOnline: user.isOnline
    });
  };

  return (
    <div className="user-list">
      {/* Recent Conversations Section */}
      {recentConversations.length > 0 && (
        <>
          <div className="user-list-header">
            <h4>Recent Chats</h4>
          </div>
          
          <div className="users-container">
            {recentConversations.map((conv) => (
              <div
                key={`recent-${conv.userId}`}
                className={`user-item ${selectedUser?.dbUserId === conv.userId ? 'selected' : ''}`}
                onClick={() => handleUserClick({
                  userId: conv.userId,
                  dbUserId: conv.userId,
                  username: conv.username,
                  isOnline: conv.isOnline
                })}
              >
                <div className="user-avatar">
                  💬
                </div>
                <div className="user-info">
                  <span className="username">{conv.username}</span>
                  <span className="last-message">{conv.lastMessage}</span>
                </div>
                <div className="message-indicator">
                  <span className="recent-badge">Recent</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Online Users Section */}
      <div className="user-list-header">
        <h4>Online Users ({users.length})</h4>
      </div>
      
      {users.length === 0 ? (
        <div className="no-users">
          <div className="no-users-icon">👤</div>
          <p>No other users online</p>
          <p className="no-users-hint">Invite friends to join the chat!</p>
        </div>
      ) : (
        <div className="users-container">
          {users.map((user) => (
            <div
              key={user.userId}
              className={`user-item ${selectedUser?.userId === user.userId ? 'selected' : ''}`}
              onClick={() => handleUserClick(user)}
            >
              <div className="user-avatar">
                👤
              </div>
              <div className="user-info">
                <div className="user-name">{user.username}</div>
                <div className="user-status">
                  <span className="status-dot online"></span>
                  Online
                </div>
              </div>
              {privateChatUsers.has(user.userId) && (
                <div className="chat-indicator">💬</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserList;