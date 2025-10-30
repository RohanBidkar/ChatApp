import { SocketProvider, useSocket } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import './App.css';

function ChatApp() {
  const { user, connected } = useSocket();
  const { isAuthenticated, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="chat-app">
        <div className="chat-content">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if user is not authenticated or not connected to socket
  if (!isAuthenticated || !user || !connected) {
    return <Login />;
  }

  // Main chat interface
  return <ChatInterface />;
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatApp />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
