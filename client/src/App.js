import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import LobbyScreen from "./screens/Lobby";
import RoomPage from "./screens/Room";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import PrivateRoute from "./conponents/PrivateRoute";
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/AuthProvider"; 

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Signup />} />
          
          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/lobby" element={<LobbyScreen />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
          </Route>

          {/* Redirects */}
          <Route path="*" element={<AuthRedirect />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}


function AuthRedirect() {
  const { isAuthenticated } = useAuth();
  
  return isAuthenticated ? (
    <Navigate to="/lobby" replace />
  ) : (
    <Navigate to="/signup" replace />
  );
}

export default App;