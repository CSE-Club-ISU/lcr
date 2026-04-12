import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage        from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import HomePage         from './pages/HomePage';
import ProfilePage      from './pages/ProfilePage';
import MatchScreen      from './pages/MatchScreen';
import RoomPage         from './pages/RoomPage';
import ProblemScreen    from './pages/ProblemScreen';
import PracticeScreen   from './pages/PracticeScreen';
import ResultsScreen    from './pages/ResultsScreen';
import LeaderboardScreen from './pages/LeaderboardScreen';
import AdminPage         from './pages/AdminPage';
import AppLayout         from './components/layout/AppLayout';
import RequireAuth       from './components/RequireAuth';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Bare routes (no sidebar) */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Authenticated routes with sidebar layout */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/"              element={<HomePage />} />
          <Route path="/profile"       element={<ProfilePage />} />
          <Route path="/play"          element={<MatchScreen />} />
          <Route path="/play/room/:code" element={<RoomPage />} />
          <Route path="/play/match"    element={<ProblemScreen />} />
          <Route path="/practice"     element={<PracticeScreen />} />
          <Route path="/results"     element={<ResultsScreen />} />
          <Route path="/leaderboard" element={<LeaderboardScreen />} />
          <Route path="/admin"       element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
