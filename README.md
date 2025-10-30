# 🚀 Real-Time Chat App with Socket.io

A comprehensive real-time chat application built with React, Express, and Socket.io featuring both private messaging and group chat functionality.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Socket.io Learning Guide](#socketio-learning-guide)
- [Setup & Installation](#setup--installation)
- [API Documentation](#api-documentation)
- [Usage Examples](#usage-examples)
- [Advanced Features](#advanced-features)

## ✨ Features

### Core Features
- ✅ **Real-time Messaging**: Instant message delivery with WebSocket communication
- ✅ **Private Chat**: 1-on-1 messaging between users
- ✅ **Group Chat**: Room-based group conversations
- ✅ **User Authentication**: Simple username-based login system
- ✅ **Online Status**: See who's currently online
- ✅ **Typing Indicators**: See when users are typing
- ✅ **Notifications**: Toast notifications for user events
- ✅ **Responsive UI**: Modern, mobile-friendly interface

### Advanced Features
- ✅ **Room Management**: Create and join custom rooms
- ✅ **Message History**: Persistent chat history per conversation
- ✅ **Auto-scroll**: Messages automatically scroll to bottom
- ✅ **Character Limits**: 500 character limit with counter
- ✅ **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket     ┌─────────────────┐
│   React Client  │ ◄──────────────► │  Express Server │
│                 │                   │                 │
│ • Components    │                   │ • Socket.io     │
│ • Socket Context│                   │ • Event Handler │
│ • State Mgmt    │                   │ • Room Manager  │
└─────────────────┘                   └─────────────────┘
```

### Client Structure
```
src/
├── components/
│   ├── Login.jsx              # User authentication
│   ├── ChatInterface.jsx      # Main chat layout
│   ├── MessageList.jsx        # Message display
│   ├── MessageInput.jsx       # Message composition
│   ├── UserList.jsx           # Online users sidebar
│   ├── RoomPanel.jsx          # Room management
│   ├── TypingIndicator.jsx    # Typing status
│   └── NotificationToast.jsx  # Event notifications
├── context/
│   └── SocketContext.jsx      # Socket.io state management
└── App.jsx                    # Root component
```

### Server Structure
```
server/
├── index.js                   # Express + Socket.io server
└── package.json               # Server dependencies
```

## 🎓 Socket.io Learning Guide

### Core Concepts

#### 1. **Connection Management**
```javascript
// Server side - Handle new connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
```

#### 2. **Event System**
```javascript
// Client - Emit events to server
socket.emit('custom_event', { data: 'hello' });

// Server - Listen for events
socket.on('custom_event', (data) => {
  console.log('Received:', data);
});
```

#### 3. **Broadcasting**
```javascript
// Send to all clients except sender
socket.broadcast.emit('message', data);

// Send to specific client
socket.to(targetSocketId).emit('message', data);

// Send to all clients
io.emit('message', data);
```

#### 4. **Rooms**
```javascript
// Join a room
socket.join('room-name');

// Send to all in room
io.to('room-name').emit('message', data);

// Send to room except sender
socket.to('room-name').emit('message', data);

// Leave room
socket.leave('room-name');
```

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation Steps

1. **Install client dependencies**
```bash
npm install
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Start the server**
```bash
# In server directory
npm start
```

4. **Start the client**
```bash
# In project root
npm run dev
```

5. **Open the app**
- Navigate to `http://localhost:5173`
- Open multiple tabs to test multi-user functionality

## 🎯 Learning Outcomes

After building this chat app, you should understand:

1. **Socket.io Fundamentals**
   - Real-time bidirectional communication
   - Event-driven architecture
   - Room and namespace concepts

2. **React State Management**
   - Context API for global state
   - Managing real-time updates
   - Component communication patterns

3. **Full-Stack Development**
   - Client-server architecture
   - WebSocket protocol
   - API design principles

Happy coding! 🚀

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
