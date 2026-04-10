import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const token     = params.get('token');
    const error     = params.get('error');

    if (error) {
      console.error('[AuthCallback] OAuth error:', error);
      navigate('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (!token) {
      navigate('/login?error=no_token');
      return;
    }

    // Store the SpacetimeDB token — used by main.tsx to authenticate the WS connection
    localStorage.setItem('lcr_auth_token', token);

    // Store GitHub profile for pre-filling the profile page
    const githubProfile = {
      githubId:  params.get('github_id')  ?? '',
      username:  params.get('username')   ?? '',
      name:      params.get('name')       ?? '',
      avatarUrl: params.get('avatar_url') ?? '',
      email:     params.get('email')      ?? '',
    };
    localStorage.setItem('lcr_github_profile', JSON.stringify(githubProfile));

    // Navigate home; SpacetimeDB connection will reconnect with the new token
    navigate('/');
  }, [navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#8b949e' }}>
      Signing in…
    </div>
  );
}
