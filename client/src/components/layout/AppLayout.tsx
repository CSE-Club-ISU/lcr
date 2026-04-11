import { Outlet } from 'react-router-dom';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from '../../module_bindings';
import type { User } from '../../module_bindings/types';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';

export default function AppLayout() {
  const ctx = useSpacetimeDB();
  const [userRows] = useTable(tables.user);

  const users = userRows as unknown as User[];
  const myUser = ctx.identity
    ? users.find((u) => u.identity.toHexString() === ctx.identity!.toHexString())
    : undefined;

  return (
    <div className="font-sans bg-bg min-h-screen flex">
      <Sidebar
        username={myUser?.username ?? ''}
        avatarUrl={myUser?.avatarUrl}
      />
      <div className="flex-1 ml-[220px] py-7 px-7 overflow-y-auto max-w-[960px]">
        <Breadcrumb />
        <Outlet />
      </div>
    </div>
  );
}
