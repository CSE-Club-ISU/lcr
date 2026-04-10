import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { getKeyPair } from './keys';

const app = new Hono();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL ?? 'http://localhost:4000';
const CLIENT_CALLBACK_URL = process.env.AUTH_REDIRECT_URI ?? 'http://localhost:5173/auth/callback';
const TOKEN_EXPIRY = '8h';

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (c) => c.json({ ok: true }));

// ---------------------------------------------------------------------------
// JWKS — SpacetimeDB fetches this to verify id_tokens
// ---------------------------------------------------------------------------

app.get('/.well-known/jwks.json', async (c) => {
  const keys = await getKeyPair();
  return c.json({ keys: [keys.publicJwk] });
});

// OpenID Connect discovery (optional, but helps SpacetimeDB)
app.get('/.well-known/openid-configuration', (c) => {
  return c.json({
    issuer: AUTH_SERVER_URL,
    authorization_endpoint: `${AUTH_SERVER_URL}/authorize`,
    jwks_uri: `${AUTH_SERVER_URL}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
  });
});

// ---------------------------------------------------------------------------
// Step 1: Redirect to GitHub OAuth
// ---------------------------------------------------------------------------

app.get('/authorize', (c) => {
  if (!GITHUB_CLIENT_ID) {
    return c.text('GITHUB_CLIENT_ID not configured', 500);
  }

  // Use a simple random state for CSRF protection
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${AUTH_SERVER_URL}/callback`,
    scope: 'read:user user:email',
    state,
    response_type: 'code',
  });

  // State is validated in /callback — in production store in a short-lived
  // cookie or cache. For this game we keep it simple.
  const url = `https://github.com/login/oauth/authorize?${params}`;
  return c.redirect(url);
});

// ---------------------------------------------------------------------------
// Step 2: GitHub OAuth callback → issue id_token
// ---------------------------------------------------------------------------

app.get('/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error || !code) {
    const reason = c.req.query('error_description') ?? error ?? 'unknown';
    return c.redirect(`${CLIENT_CALLBACK_URL}?error=${encodeURIComponent(reason)}`);
  }

  // Exchange code for GitHub access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${AUTH_SERVER_URL}/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return c.redirect(`${CLIENT_CALLBACK_URL}?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return c.redirect(`${CLIENT_CALLBACK_URL}?error=${encodeURIComponent(tokenData.error ?? 'no_access_token')}`);
  }

  // Fetch GitHub user profile
  const [profileRes, emailRes] = await Promise.all([
    fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'lcr-auth',
      },
    }),
    fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'lcr-auth',
      },
    }),
  ]);

  if (!profileRes.ok) {
    return c.redirect(`${CLIENT_CALLBACK_URL}?error=profile_fetch_failed`);
  }

  const profile = await profileRes.json() as {
    id: number;
    login: string;
    name?: string;
    avatar_url: string;
    email?: string;
  };

  // Best-effort primary email
  let email = profile.email ?? '';
  if (!email && emailRes.ok) {
    const emails = await emailRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
    email = emails.find(e => e.primary && e.verified)?.email ?? emails[0]?.email ?? '';
  }

  // Sign the OIDC id_token
  const keys = await getKeyPair();
  const now = Math.floor(Date.now() / 1000);

  const idToken = await new SignJWT({
    sub: String(profile.id),
    name: profile.name ?? profile.login,
    login: profile.login,
    avatar_url: profile.avatar_url,
    email,
  })
    .setProtectedHeader({ alg: 'RS256', kid: keys.kid })
    .setIssuer(AUTH_SERVER_URL)
    .setAudience('lcr')
    .setIssuedAt(now)
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(keys.privateKey);

  // Redirect back to the client with the id_token
  return c.redirect(`${CLIENT_CALLBACK_URL}?id_token=${encodeURIComponent(idToken)}`);
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const port = parseInt(process.env.PORT ?? '4000');
console.log(`Auth server listening on port ${port}`);
console.log(`  Issuer: ${AUTH_SERVER_URL}`);
console.log(`  Client callback: ${CLIENT_CALLBACK_URL}`);

export default {
  port,
  fetch: app.fetch,
};
