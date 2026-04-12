import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpacetimeDB } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { User } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';

export default function HomePage() {
  const navigate = useNavigate();
  const ctx      = useSpacetimeDB();
  const [users]  = useTypedTable<User>(tables.user);

  useEffect(() => {
    const token     = localStorage.getItem('lcr_auth_token');
    const guestMode = localStorage.getItem('lcr_guest_mode') === 'true';
    if (!token && !guestMode) {
      navigate('/login');
      return;
    }

    if (!ctx.isActive) return;

    const myIdentity = ctx.identity;
    if (!myIdentity) return;

    const myUser = users.find(u => identityEq(u.identity, myIdentity));

    if (!myUser) return; // still loading

    navigate('/profile');
  }, [ctx.isActive, ctx.identity, users, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen text-text-muted">
      Loading…
    </div>
  );
}
