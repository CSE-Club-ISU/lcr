import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('lcr_auth_token');
  const isGuest = localStorage.getItem('lcr_guest_mode') === 'true';

  if (!token && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
