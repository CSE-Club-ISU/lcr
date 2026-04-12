import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL ?? 'http://localhost:4000';

const ADJECTIVES = ['swift', 'bold', 'keen', 'sharp', 'quick', 'calm', 'bright', 'cool'];
const NOUNS = ['coder', 'hacker', 'solver', 'runner', 'thinker', 'builder', 'dev', 'ace'];

function randomGuestName(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}_${noun}_${num}`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');

  const handleSignIn = () => {
    window.location.href = `${AUTH_SERVER_URL}/authorize`;
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setGuestError('');
    try {
      // Request a guest token from the auth server
      const res = await fetch(`${AUTH_SERVER_URL}/guest`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to create guest session');
      }
      const { token } = await res.json() as { token: string };

      // Store token and guest profile
      const username = randomGuestName();
      localStorage.setItem('lcr_auth_token', token);
      localStorage.setItem('lcr_guest_mode', 'true');
      localStorage.setItem('lcr_github_profile', JSON.stringify({
        githubId:  '',
        username,
        name:      username,
        avatarUrl: '',
        email:     '',
      }));
      navigate('/');
    } catch (err) {
      setGuestError(String(err instanceof Error ? err.message : err));
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg font-sans">
      <div className="card flex flex-col items-center gap-5 p-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-charcoal flex items-center justify-center font-black text-[15px] text-gold-bright tracking-tight">
            LC
          </div>
          <span className="font-black text-3xl text-text tracking-tight">
            LCR<span className="text-gold-bright">.</span>
          </span>
        </div>
        <p className="m-0 text-sm text-text-muted">Competitive Coding — ISU CSE Club</p>
        <button className="btn-primary mt-2 w-full" onClick={handleSignIn}>
          Sign in with GitHub
        </button>
        <button className="btn-secondary w-full text-sm" onClick={handleGuest} disabled={guestLoading}>
          {guestLoading ? 'Loading…' : 'Continue as Guest'}
        </button>
        {guestError && <p className="m-0 text-red text-[13px]">{guestError}</p>}
      </div>
    </div>
  );
}
