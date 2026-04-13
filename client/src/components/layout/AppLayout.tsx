import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../../module_bindings';
import type { User } from '../../module_bindings/types';
import { useTypedTable } from '../../utils/useTypedTable';
import { identityEq } from '../../utils/identity';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import SettingsDialog from '../ui/SettingsDialog';

export default function AppLayout() {
  const ctx = useSpacetimeDB();
  const [users] = useTypedTable<User>(tables.user);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const setProfile = useReducer(reducers.setProfile);

  const myUser = ctx.identity
    ? users.find((u) => identityEq(u.identity, ctx.identity))
    : undefined;

  // Sync GitHub profile into the SpacetimeDB user row on first login.
  // The auth callback stores profile data in localStorage but can't call
  // SpacetimeDB reducers before the connection is ready. We do it here,
  // once the user row is loaded and github_id is still empty.
  useEffect(() => {
    if (!myUser || myUser.githubId) return;
    const raw = localStorage.getItem('lcr_github_profile');
    if (!raw) return;
    try {
      const profile = JSON.parse(raw) as {
        githubId: string; username: string; name: string;
        avatarUrl: string; email: string;
      };
      if (!profile.githubId) return;
      setProfile({
        username:   myUser.username || profile.username,
        firstName:  myUser.firstName || profile.name.split(' ')[0] || '',
        lastName:   myUser.lastName  || profile.name.split(' ').slice(1).join(' ') || '',
        githubId:   profile.githubId,
        avatarUrl:  myUser.avatarUrl || profile.avatarUrl,
      });
    } catch { /* malformed localStorage entry — ignore */ }
  }, [myUser?.identity.toHexString(), myUser?.githubId]);

  return (
    <div className="font-sans bg-bg min-h-screen flex">
      <Sidebar
        username={myUser?.username ?? ''}
        avatarUrl={myUser?.avatarUrl}
        isAdmin={myUser?.isAdmin ?? false}
        onSettingsClick={() => setSettingsOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />
      <div
        className="flex-1 py-10 px-10 overflow-y-auto transition-[margin] duration-200"
        style={{ marginLeft: sidebarCollapsed ? 56 : 232 }}
      >
        <div className="max-w-[1120px] mx-auto enter-fade">
          <Breadcrumb />
          <Outlet />
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
