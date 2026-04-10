import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OIDC_TOKEN_KEY = 'lcr_oidc_token';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idToken = params.get('id_token');
    const error   = params.get('error');

    if (error) {
      console.error('[AuthCallback] OAuth error:', error);
      navigate('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (!idToken) {
      navigate('/login?error=no_token');
      return;
    }

    // Store the OIDC id_token — SpacetimeDB uses this to authenticate
    localStorage.setItem(OIDC_TOKEN_KEY, idToken);
    // Also store under the key main.tsx looks for so the connection picks it up
    localStorage.setItem('lcr_auth_token', idToken);

    // Navigate home; the SpacetimeDB connection will be rebuilt with the new token
    // on the next render now that localStorage has the token.
    navigate('/');
  }, [navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#8b949e' }}>
      Signing in…
    </div>
  );
}
