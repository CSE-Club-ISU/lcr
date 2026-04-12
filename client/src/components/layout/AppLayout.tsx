import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSpacetimeDB } from 'spacetimedb/react';
import { tables } from '../../module_bindings';
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

  const myUser = ctx.identity
    ? users.find((u) => identityEq(u.identity, ctx.identity))
    : undefined;

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
        className="flex-1 py-7 px-7 overflow-y-auto transition-[margin] duration-200"
        style={{ marginLeft: sidebarCollapsed ? 56 : 220 }}
      >
        <div className="max-w-[960px] mx-auto">
          <Breadcrumb />
          <Outlet />
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
