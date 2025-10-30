import { useState } from 'react';
import './RoomPanel.css';

const RoomPanel = ({ currentRoom, onRoomSelect }) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Predefined rooms for quick access
  const predefinedRooms = [
    { roomId: 'general', roomName: 'General' },
    { roomId: 'random', roomName: 'Random' },
    { roomId: 'tech', roomName: 'Tech Talk' },
    { roomId: 'gaming', roomName: 'Gaming' },
  ];

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      const roomId = newRoomName.toLowerCase().replace(/\s+/g, '-');
      onRoomSelect({ roomId, roomName: newRoomName.trim() });
      setNewRoomName('');
      setShowCreateForm(false);
    }
  };

  const handleJoinRoom = (room) => {
    onRoomSelect(room);
  };

  return (
    <div className="room-panel">
      <div className="room-panel-header">
        <h4>Chat Rooms</h4>
        <button 
          className="create-room-button"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          ➕
        </button>
      </div>

      {/* Current Room */}
      {currentRoom && (
        <div className="current-room">
          <div className="current-room-header">
            <span>📍 Current Room</span>
          </div>
          <div className="room-item current">
            <div className="room-icon">🏠</div>
            <div className="room-info">
              <div className="room-name">{currentRoom.roomName}</div>
              <div className="room-id">#{currentRoom.roomId}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Room Form */}
      {showCreateForm && (
        <div className="create-room-form">
          <form onSubmit={handleCreateRoom}>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name..."
              className="room-name-input"
              maxLength={30}
              autoFocus
            />
            <div className="form-buttons">
              <button type="submit" className="create-button" disabled={!newRoomName.trim()}>
                Create
              </button>
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewRoomName('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Predefined Rooms */}
      <div className="rooms-container">
        <div className="rooms-section">
          <h5>Popular Rooms</h5>
          {predefinedRooms.map((room) => (
            <div
              key={room.roomId}
              className={`room-item ${currentRoom?.roomId === room.roomId ? 'current' : ''}`}
              onClick={() => handleJoinRoom(room)}
            >
              <div className="room-icon">🏠</div>
              <div className="room-info">
                <div className="room-name">{room.roomName}</div>
                <div className="room-id">#{room.roomId}</div>
              </div>
              {currentRoom?.roomId === room.roomId && (
                <div className="current-indicator">✓</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomPanel;