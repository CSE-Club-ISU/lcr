import { useLocation } from 'react-router-dom';

const labels: Record<string, string> = {
  '/profile': 'Profile',
  '/play': 'Find Match',
  '/leaderboard': 'Leaderboard',
  '/results': 'Match Results',
};

export default function Breadcrumb() {
  const location = useLocation();

  // Match dynamic routes
  let label = labels[location.pathname];
  if (!label) {
    if (location.pathname.startsWith('/play/room/')) label = 'Room';
    else if (location.pathname.startsWith('/play/match')) label = 'Live Match';
    else label = 'Home';
  }

  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="text-xs text-text-faint">LCR</span>
      <span className="text-xs text-text-faint">/</span>
      <span className="text-xs font-semibold text-text">{label}</span>
    </div>
  );
}
