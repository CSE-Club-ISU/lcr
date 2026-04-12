import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

// UX convenience: redirect guests to /login before they hit the practice screen.
// Real enforcement is server-side — the executor rejects sandbox requests from
// identities with an empty github_id.
export default function RequireLogin({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('lcr_auth_token');
  const isGuest = localStorage.getItem('lcr_guest_mode') === 'true';
  if (!token || isGuest) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
