import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

function GithubMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.32-1.28-1.67-1.28-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.45.11-3.02 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0C17.03 5.1 18 5.41 18 5.41c.62 1.57.23 2.73.12 3.02.73.8 1.17 1.82 1.17 3.08 0 4.43-2.69 5.4-5.26 5.69.41.35.77 1.04.77 2.1v3.12c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL ?? 'http://localhost:4000';

// Guest mode is a dev-only convenience. `import.meta.env.DEV` is true under
// `vite dev` and false in any `vite build` output, so production bundles
// (including the Docker image) automatically omit the guest login path.
const GUEST_MODE_ENABLED = import.meta.env.DEV;

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
      const res = await fetch(`${AUTH_SERVER_URL}/guest`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to create guest session');
      }
      const { token } = await res.json() as { token: string };

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
    <div className="surface-hero relative min-h-screen bg-bg font-sans overflow-hidden flex flex-col">
      {/* Deep radial vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 900px 600px at 50% 30%, rgba(192, 39, 45, 0.12), transparent 65%), radial-gradient(ellipse 600px 400px at 50% 100%, rgba(245, 197, 24, 0.05), transparent 60%)',
        }}
      />

      {/* Top wordmark */}
      <header className="relative flex items-center justify-between px-10 py-8 enter-fade">
        <span
          className="text-xl text-text leading-none"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          LCR<span className="wordmark-period">.</span>
        </span>
        <span className="label-eyebrow">Iowa State · CSE Club</span>
      </header>

      {/* Hero content */}
      <main className="relative flex-1 flex items-center justify-center px-8">
        <div className="max-w-[620px] w-full flex flex-col items-center text-center gap-10">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 enter-fade" style={{ animationDelay: '60ms' }}>
            <span className="h-px w-8 bg-[var(--color-hairline-gold)]" />
            <span className="eyebrow-italic text-gold-bright">a competitive coding arena</span>
            <span className="h-px w-8 bg-[var(--color-hairline-gold)]" />
          </div>

          {/* Display headline */}
          <h1
            className="m-0 text-text enter-fade"
            style={{
              animationDelay: '140ms',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 'clamp(56px, 9vw, 104px)',
              lineHeight: 0.96,
              letterSpacing: '-0.025em',
              fontVariationSettings: '"opsz" 144',
            }}
          >
            Enter&nbsp;the&nbsp;<span className="text-accent">arena</span>.
          </h1>

          <p
            className="m-0 text-text-muted max-w-[440px] enter-fade"
            style={{ animationDelay: '220ms', fontSize: 15, lineHeight: 1.65 }}
          >
            One-versus-one algorithmic duels. Pass tests to deal damage, spend energy
            on powerups, drain your opponent&apos;s HP before the clock runs out.
          </p>

          {/* CTA group */}
          <div
            className="flex flex-col items-center gap-3 w-full max-w-[340px] enter-fade"
            style={{ animationDelay: '300ms' }}
          >
            <hr className="rule-gold w-full" />
            <button
              onClick={handleSignIn}
              className="btn-editorial w-full justify-center group text-[15px] py-3.5"
            >
              <GithubMark size={16} />
              <span>Sign in with GitHub</span>
              <ArrowRight
                size={16}
                strokeWidth={2}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </button>
            {GUEST_MODE_ENABLED && (
              <>
                <button
                  className="btn-ghost w-full justify-center text-[13px]"
                  onClick={handleGuest}
                  disabled={guestLoading}
                >
                  {guestLoading ? 'Loading\u2026' : 'Continue as guest'}
                </button>
                {guestError && (
                  <p className="m-0 text-red text-[12px] mono-tabular">{guestError}</p>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer meta */}
      <footer className="relative px-10 py-6 flex items-center justify-between">
        <span className="label-eyebrow">v. 2026 · SpacetimeDB</span>
        <span className="label-eyebrow">made for the club</span>
      </footer>
    </div>
  );
}
