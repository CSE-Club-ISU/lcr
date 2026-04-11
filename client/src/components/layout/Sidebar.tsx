import { useLocation, useNavigate } from 'react-router-dom';
import Avatar from '../ui/Avatar';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'profile', label: 'Profile', icon: '◉', path: '/profile' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '⬡', path: '/leaderboard' },
  { id: 'play', label: 'Play', icon: '▶', path: '/play' },
];

interface Props {
  username: string;
  avatarUrl?: string;
}

export default function Sidebar({ username, avatarUrl }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="w-[220px] bg-surface border-r border-border px-4 py-6 flex flex-col gap-1 shrink-0 sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-3 pb-6 flex items-center gap-[10px]">
        <div className="w-[34px] h-[34px] rounded-lg bg-charcoal flex items-center justify-center font-black text-[13px] text-gold-bright tracking-tight">
          LC
        </div>
        <span className="font-black text-[17px] text-text tracking-tight">
          LCR<span className="text-gold-bright">.</span>
        </span>
      </div>

      {/* Nav */}
      {navItems.map((n) => {
        const active = isActive(n.path);
        return (
          <button
            key={n.id}
            onClick={() => navigate(n.path)}
            className={`flex items-center gap-[10px] px-[14px] py-[10px] rounded-[10px] border-none text-left w-full text-sm cursor-pointer transition-colors duration-100 ${
              active
                ? 'bg-accent-soft text-accent font-bold border-l-[3px] border-l-gold-bright'
                : 'bg-transparent text-text-muted font-medium border-l-[3px] border-l-transparent'
            }`}
          >
            <span className="text-base">{n.icon}</span>
            {n.label}
          </button>
        );
      })}

      {/* User info at bottom */}
      <div className="mt-auto pt-4 px-[14px] border-t border-border">
        <div className="flex items-center gap-[10px]">
          <Avatar src={avatarUrl} username={username || '?'} size="sm" />
          <div>
            <div className="text-[13px] font-bold text-text">{username || '...'}</div>
            <div className="text-[11px] text-text-muted">Gold &middot; 1,500 ELO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
