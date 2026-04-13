import { useLocation, useNavigate } from "react-router-dom";
import {
  Swords,
  Target,
  Package,
  Shield,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Avatar from "../ui/Avatar";

interface NavItem {
  id: string;
  label: string;
  Icon: LucideIcon;
  path: string;
}

const navItems: NavItem[] = [
  { id: "play",        label: "Play",        Icon: Swords,  path: "/play" },
  { id: "practice",    label: "Practice",    Icon: Target,  path: "/practice" },
  { id: "loadout",     label: "Loadout",     Icon: Package, path: "/loadout" },
  { id: "leaderboard", label: "Leaderboard", Icon: Trophy,  path: "/leaderboard" },
];

interface Props {
  username: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  onSettingsClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  username,
  avatarUrl,
  isAdmin,
  onSettingsClick,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const width = collapsed ? "w-14" : "w-[232px]";

  const navBtnBase =
    "relative flex items-center gap-3 rounded-md border-none text-left w-full text-[13px] cursor-pointer transition-all duration-150 group";

  const renderNavItem = (item: { label: string; Icon: LucideIcon; path: string }) => {
    const active = isActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        title={collapsed ? item.label : undefined}
        className={`${navBtnBase}
          ${collapsed ? "justify-center px-0 py-2.5" : "pl-4 pr-3 py-2.5"}
          ${active
            ? "bg-[rgba(245,197,24,0.04)] text-text font-medium"
            : "bg-transparent text-text-muted font-normal hover:text-text hover:bg-[rgba(240,235,229,0.02)]"
          }`}
      >
        {active && !collapsed && (
          <span
            aria-hidden
            className="absolute left-0 top-2 bottom-2 w-px bg-gold-bright"
          />
        )}
        {active && collapsed && (
          <span
            aria-hidden
            className="absolute left-1 top-2 bottom-2 w-px bg-gold-bright"
          />
        )}
        <item.Icon size={16} strokeWidth={1.75} className="shrink-0" />
        {!collapsed && <span className="tracking-[-0.005em]">{item.label}</span>}
      </button>
    );
  };

  return (
    <div
      className={`${width} bg-surface/80 backdrop-blur-md border-r border-border px-2 py-6 flex flex-col gap-0.5 shrink-0 fixed top-0 left-0 h-screen transition-[width] duration-200 overflow-hidden`}
    >
      {/* Wordmark + collapse toggle */}
      <div
        className={`flex items-center mb-7 ${collapsed ? "justify-center px-0" : "justify-between px-3"}`}
      >
        {!collapsed && (
          <button
            onClick={() => navigate("/profile")}
            className="bg-transparent border-none cursor-pointer p-0"
          >
            <span
              className="text-[22px] text-text leading-none"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                fontVariationSettings: '"opsz" 72',
              }}
            >
              LCR<span className="wordmark-period">.</span>
            </span>
          </button>
        )}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-7 h-7 rounded-md border-none bg-transparent text-text-faint cursor-pointer hover:text-text transition-colors shrink-0"
        >
          {collapsed ? <PanelLeftOpen size={14} strokeWidth={1.75} /> : <PanelLeftClose size={14} strokeWidth={1.75} />}
        </button>
      </div>

      {!collapsed && (
        <div className="label-eyebrow px-4 pb-2">Arena</div>
      )}

      {/* Nav items */}
      {navItems.map((n) => renderNavItem(n))}

      {isAdmin && (
        <>
          {!collapsed && <div className="label-eyebrow px-4 pt-5 pb-2">Admin</div>}
          {collapsed && <div className="h-3" />}
          {renderNavItem({ label: "Admin", Icon: Shield, path: "/admin" })}
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      <hr className="rule-hairline mx-2 my-3" />

      {/* Settings */}
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          title={collapsed ? "Settings" : undefined}
          className={`${navBtnBase} text-text-muted hover:text-text
            ${collapsed ? "justify-center px-0 py-2.5" : "pl-4 pr-3 py-2.5"}`}
        >
          <Settings size={16} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && "Settings"}
        </button>
      )}

      {/* User info */}
      <button
        onClick={() => navigate("/profile")}
        title={collapsed ? username || "Profile" : undefined}
        className={`mt-1 pt-3 border-none bg-transparent cursor-pointer text-left w-full hover:opacity-90 transition-opacity
          ${collapsed ? "flex justify-center px-0" : "px-3"}`}
      >
        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <Avatar src={avatarUrl} username={username || "?"} size="sm" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-text truncate">
                {username || "—"}
              </div>
              <div className="label-eyebrow leading-tight" style={{ fontSize: 9 }}>
                ISU CSE Club
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
