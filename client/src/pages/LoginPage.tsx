const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const handleSignIn = () => {
    window.location.href = `${AUTH_SERVER_URL}/authorize`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="card flex flex-col items-center gap-4 p-12">
        <h1 className="m-0 text-5xl font-bold text-gh-bright tracking-tight">LCR</h1>
        <p className="m-0 text-sm text-gh-muted">Competitive Coding — CS Club ISU</p>
        <button className="btn-primary mt-2" onClick={handleSignIn}>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
