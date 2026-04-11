const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const handleSignIn = () => {
    window.location.href = `${AUTH_SERVER_URL}/authorize`;
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
        <button className="btn-primary mt-2" onClick={handleSignIn}>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
