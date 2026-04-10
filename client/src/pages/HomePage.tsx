import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';

export default function HomePage() {
  const navigate = useNavigate();
  const ctx      = useSpacetimeDB();
  const [users]  = useTable(tables.user);

  useEffect(() => {
    const token = localStorage.getItem('lcr_auth_token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!ctx.isActive) return;

    const myIdentity = ctx.identity;
    if (!myIdentity) return;

    const myUser = (users as any[]).find(
      (u: any) => u.identity.toHexString() === myIdentity.toHexString()
    );

    if (!myUser) return; // still loading

    if (!myUser.username) {
      navigate('/profile');
    } else {
      navigate('/lobby');
    }
  }, [ctx.isActive, ctx.identity, users, navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#8b949e' }}>
      Loading…
    </div>
  );
}
