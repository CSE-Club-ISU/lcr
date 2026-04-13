import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const labels: Record<string, string> = {
  '/profile': 'Profile',
  '/play': 'Find Match',
  '/leaderboard': 'Leaderboard',
  '/results': 'Match Results',
  '/practice': 'Practice',
  '/loadout': 'Loadout',
  '/admin': 'Admin',
};

export default function Breadcrumb() {
  const location = useLocation();

  let label = labels[location.pathname];
  if (!label) {
    if (location.pathname.startsWith('/play/room/')) label = 'Room';
    else if (location.pathname.startsWith('/play/match')) label = 'Live Match';
    else if (location.pathname.startsWith('/play/custom')) label = 'Custom Game';
    else label = 'Home';
  }

  return (
    <div className="flex items-center gap-1.5 mb-7">
      <span className="label-eyebrow" style={{ letterSpacing: '0.24em' }}>LCR</span>
      <ChevronRight size={11} strokeWidth={1.75} className="text-text-faint" />
      <span className="label-eyebrow text-text" style={{ letterSpacing: '0.18em' }}>{label}</span>
    </div>
  );
}
