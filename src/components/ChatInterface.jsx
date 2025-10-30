import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import RoomPanel from './RoomPanel';
import NotificationToast from './NotificationToast';
import UserSearch from './UserSearch';
import './ChatInterface.css';

const ChatInterface = () => {
  const { 
    user: socketUser, 
    connected, 
    disconnectUser, 
    onlineUsers, 
    messages, 
    currentRoom,
    roomUsers,
    sendPrivateMessage,
    sendRoomMessage,
    joinRoom,
    setMessages
  } = useSocket();

  const { user: authUser, logout, loadPrivateMessages, loadRoomMessages, getConversations } = useAuth();

  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'rooms'
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateChatUsers, setPrivateChatUsers] = useState(new Map()); // Track private conversations
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [recentConversations, setRecentConversations] = useState([]);

  // Load recent conversations when component mounts
  useEffect(() => {
    const loadRecentConversations = async () => {
      try {
        if (authUser && authUser._id) {
          const conversations = await getConversations();
          setRecentConversations(conversations);
          
          // Add these users to privateChatUsers for easy access
          const conversationMap = new Map();
          conversations.forEach(conv => {
            conversationMap.set(conv.userId, {
              userId: conv.userId,
              dbUserId: conv.userId,
              username: conv.username,
              isOnline: conv.isOnline
            });
          });
          setPrivateChatUsers(conversationMap);
        }
      } catch (error) {
        console.error('Failed to load recent conversations:', error);
      }
    };

    loadRecentConversations();
  }, [authUser, getConversations]);

  const handleUserSelect = async (selectedUser) => {
    setSelectedUser(selectedUser);
    // Note: We can't directly set currentRoom to null here, as it's managed by the socket context
    // Instead, the user should leave the room manually if needed
    
    // Track this private conversation
    setPrivateChatUsers(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(selectedUser.userId)) {
        newMap.set(selectedUser.userId, selectedUser);
      }
      return newMap;
    });
    
    try {
      // Load chat history for this private conversation
      // Use dbUserId (database ID) for API calls, not socketId
      const userIdToUse = selectedUser.dbUserId || selectedUser.userId;
      
      if (userIdToUse && userIdToUse.length === 24) { // Valid MongoDB ObjectId length
        const chatHistory = await loadPrivateMessages(userIdToUse);
        
        if (chatHistory && chatHistory.messages) {
          setMessages(chatHistory.messages);
        } else {
          // Clear messages if no history available
          setMessages([]);
        }
      } else {
        console.warn('Invalid user ID for loading chat history:', userIdToUse);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Clear messages on error
      setMessages([]);
    }
  };

  const handleRoomSelect = async (roomData) => {
    setSelectedUser(null); // Exit private chat when joining room
    joinRoom(roomData.roomId, roomData.roomName);
    
    try {
      // Load room chat history
      const roomHistory = await loadRoomMessages(roomData.roomId);
      
      if (roomHistory && roomHistory.messages) {
        setMessages(roomHistory.messages);
      } else {
        // Clear messages if no history available
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load room history:', error);
      // Clear messages on error
      setMessages([]);
    }
  };

  const handleSendMessage = (message) => {
    if (selectedUser) {
      // Send private message
      sendPrivateMessage(selectedUser.userId, message);
    } else if (currentRoom) {
      // Send room message
      sendRoomMessage(message);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to leave the chat?')) {
      disconnectUser();
    }
  };

  const getChatTitle = () => {
    if (selectedUser) {
      return `💬 Private chat with ${selectedUser.username}`;
    } else if (currentRoom) {
      return `🏠 ${currentRoom.roomName}`;
    }
    return '👋 Select a user or join a room to start chatting';
  };

  const getChatParticipants = () => {
    if (selectedUser) {
      return [selectedUser];
    } else if (currentRoom) {
      return roomUsers;
    }
    return [];
  };

  return (
    <div className="chat-interface">
      <NotificationToast />
      
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⚡</span><h2 className="logo-text">InstaTalk</h2>
          </div>
          <span className="username">{authUser?.username || 'User'}</span>
        </div>
        <div className="header-right">
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className="chat-body">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-tabs">
            <button 
              className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 Users ({onlineUsers.length})
            </button>
            <button 
              className={`tab-button ${activeTab === 'rooms' ? 'active' : ''}`}
              onClick={() => setActiveTab('rooms')}
            >
              🏠 Rooms
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'users' ? (
              <>
                <div className="users-header">
                  <button 
                    className="search-users-button"
                    onClick={() => setShowUserSearch(true)}
                  >
                    🔍 Find Users
                  </button>
                </div>
                <UserList 
                  users={onlineUsers}
                  selectedUser={selectedUser}
                  onUserSelect={handleUserSelect}
                  privateChatUsers={privateChatUsers}
                  recentConversations={recentConversations}
                />
              </>
            ) : (
              <RoomPanel 
                currentRoom={currentRoom}
                onRoomSelect={handleRoomSelect}
              />
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="main-chat">
          <div className="chat-title">
            <h3>{getChatTitle()}</h3>
            {(selectedUser || currentRoom) && (
              <div className="chat-participants">
                {getChatParticipants().map(participant => (
                  <span key={participant.userId} className="participant">
                    👤 {participant.username}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="chat-area">
            <MessageList 
              messages={messages}
              currentUser={authUser}
              chatContext={selectedUser ? 'private' : 'room'}
            />
            
            {(selectedUser || currentRoom) && (
              <MessageInput 
                onSendMessage={handleSendMessage}
                selectedUser={selectedUser}
                currentRoom={currentRoom}
                placeholder={
                  selectedUser 
                    ? `Message ${selectedUser.username}...`
                    : currentRoom 
                      ? `Message in ${currentRoom.roomName}...`
                      : 'Type a message...'
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <UserSearch 
          onClose={() => setShowUserSearch(false)}
          onUserSelect={(user) => {
            handleUserSelect({
              userId: user.socketId,
              dbUserId: user._id,
              username: user.username,
              isOnline: user.isOnline
            });
          }}
        />
      )}
    </div>
  );
};

export default ChatInterface;