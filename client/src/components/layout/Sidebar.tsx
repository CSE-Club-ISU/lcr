import { useLocation, useNavigate } from "react-router-dom";
import Avatar from "../ui/Avatar";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: "play",     label: "Play",     icon: "▶", path: "/play" },
  { id: "practice", label: "Practice", icon: "✎", path: "/practice" },
];

interface Props {
  username: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  onSettingsClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ username, avatarUrl, isAdmin, onSettingsClick, collapsed = false, onToggleCollapse }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const width = collapsed ? "w-14" : "w-[220px]";

  return (
    <div className={`${width} bg-surface border-r border-border px-2 py-6 flex flex-col gap-1 shrink-0 fixed top-0 left-0 h-screen transition-[width] duration-200 overflow-hidden`}>

      {/* Logo + collapse toggle */}
      <div className={`flex items-center mb-6 px-1 ${collapsed ? "justify-center" : "justify-between px-3"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-charcoal flex items-center justify-center font-black text-[13px] text-gold-bright tracking-tight shrink-0">
              LC
            </div>
            <span className="font-black text-[17px] text-text tracking-tight">
              LCR<span className="text-gold-bright">.</span>
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent text-text-faint cursor-pointer hover:text-text hover:bg-surface-alt transition-colors shrink-0"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Nav items */}
      {navItems.map((n) => {
        const active = isActive(n.path);
        return (
          <button
            key={n.id}
            onClick={() => navigate(n.path)}
            title={collapsed ? n.label : undefined}
            className={`flex items-center gap-2.5 rounded-[10px] border-none text-left w-full text-sm cursor-pointer transition-colors duration-100
              ${collapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-2.5"}
              ${active
                ? "bg-accent-soft text-accent font-bold border-l-[3px] border-l-gold-bright"
                : "bg-transparent text-text-muted font-medium border-l-[3px] border-l-transparent"
              }`}
          >
            <span className="text-base shrink-0">{n.icon}</span>
            {!collapsed && n.label}
          </button>
        );
      })}

      {/* Admin nav */}
      {isAdmin && (() => {
        const active = isActive("/admin");
        return (
          <button
            onClick={() => navigate("/admin")}
            title={collapsed ? "Admin" : undefined}
            className={`flex items-center gap-2.5 rounded-[10px] border-none text-left w-full text-sm cursor-pointer transition-colors duration-100
              ${collapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-2.5"}
              ${active
                ? "bg-accent-soft text-accent font-bold border-l-[3px] border-l-gold-bright"
                : "bg-transparent text-text-muted font-medium border-l-[3px] border-l-transparent"
              }`}
          >
            <span className="text-base shrink-0">◈</span>
            {!collapsed && "Admin"}
          </button>
        );
      })()}

      {/* Settings */}
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          title={collapsed ? "Settings" : undefined}
          className={`mt-auto flex items-center gap-2.5 rounded-[10px] border-none bg-transparent text-text-muted text-sm font-medium cursor-pointer hover:text-text w-full transition-colors
            ${collapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-2.5"}`}
        >
          <span className="text-base shrink-0">⚙</span>
          {!collapsed && "Settings"}
        </button>
      )}

      {/* User info */}
      <button
        onClick={() => navigate("/profile")}
        title={collapsed ? username || "Profile" : undefined}
        className={`${onSettingsClick ? "" : "mt-auto "}pt-4 border-t border-border border-none bg-transparent cursor-pointer text-left w-full transition-opacity hover:opacity-80
          ${collapsed ? "flex justify-center px-0" : "px-3.5"}`}
      >
        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <Avatar src={avatarUrl} username={username || "?"} size="sm" />
          {!collapsed && (
            <div>
              <div className="text-[13px] font-bold text-text">{username || "..."}</div>
              <div className="text-[11px] text-text-muted">ISU CSE Club</div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
