import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage        from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import HomePage         from './pages/HomePage';
import ProfilePage      from './pages/ProfilePage';
import LobbyPage        from './pages/LobbyPage';
import RoomPage         from './pages/RoomPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/profile"       element={<ProfilePage />} />
        <Route path="/lobby"         element={<LobbyPage />} />
        <Route path="/room/:code"    element={<RoomPage />} />
        <Route path="/"              element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
