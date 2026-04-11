import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL ?? 'http://localhost:4000';

export default function AuthCallbackPage() {
  const navigate  = useNavigate();
  const didRun    = useRef(false);
  const [statusText, setStatusText] = useState('Signing in…');

  useEffect(() => {
    // Guard against React StrictMode double-invoke firing the redeem twice,
    // which would fail on the second call (code already consumed).
    if (didRun.current) return;
    didRun.current = true;

    const params = new URLSearchParams(window.location.search);
    // Clear the code from the URL so back-navigation can't retry it.
    window.history.replaceState({}, '', window.location.pathname);

    const code   = params.get('code');
    const error  = params.get('error');

    if (error) {
      console.error('[AuthCallback] OAuth error:', error);
      navigate('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (!code) {
      navigate('/login?error=no_code');
      return;
    }

    // Exchange the one-time code for the token via POST — keeps token out of URL/logs
    fetch(`${AUTH_SERVER_URL}/redeem`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code }),
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'redeem_failed' })) as { error?: string };
          throw new Error(err.error ?? 'redeem_failed');
        }
        return res.json() as Promise<{
          token:     string;
          githubId:  string;
          username:  string;
          name:      string;
          avatarUrl: string;
          email:     string;
        }>;
      })
      .then(data => {
        localStorage.setItem('lcr_auth_token', data.token);
        localStorage.setItem('lcr_github_profile', JSON.stringify({
          githubId:  data.githubId,
          username:  data.username,
          name:      data.name,
          avatarUrl: data.avatarUrl,
          email:     data.email,
        }));
        navigate('/');
      })
      .catch(err => {
        console.error('[AuthCallback] redeem failed:', err);
        setStatusText('Sign-in failed. Redirecting…');
        navigate('/login?error=' + encodeURIComponent(String(err.message ?? err)));
      });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen text-text-muted">
      {statusText}
    </div>
  );
}
