const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const handleSignIn = () => {
    window.location.href = `${AUTH_SERVER_URL}/authorize`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>LCR</h1>
        <p style={styles.subtitle}>Competitive Coding — CS Club ISU</p>
        <button style={styles.button} onClick={handleSignIn}>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0d1117',
  } as React.CSSProperties,
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
    padding: '48px',
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
  },
  title: {
    margin: 0,
    fontSize: '48px',
    fontWeight: 700,
    color: '#f0f6fc',
    letterSpacing: '-1px',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#8b949e',
  },
  button: {
    marginTop: '8px',
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#238636',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
