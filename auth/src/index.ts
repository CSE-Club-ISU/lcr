import { Hono } from 'hono';
import { getToken, setToken } from './store';

const app = new Hono();

const GITHUB_CLIENT_ID     = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const AUTH_SERVER_URL      = process.env.AUTH_SERVER_URL      ?? 'http://localhost:4000';
const CLIENT_CALLBACK_URL  = process.env.AUTH_REDIRECT_URI    ?? 'http://localhost:5173/auth/callback';
const SPACETIMEDB_URL      = process.env.SPACETIMEDB_URL      ?? 'http://spacetimedb:3000';

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (c) => c.json({ ok: true }));

// ---------------------------------------------------------------------------
// Step 1: Redirect to GitHub OAuth
// ---------------------------------------------------------------------------

app.get('/authorize', (c) => {
  if (!GITHUB_CLIENT_ID) return c.text('GITHUB_CLIENT_ID not configured', 500);

  const params = new URLSearchParams({
    client_id:     GITHUB_CLIENT_ID,
    redirect_uri:  `${AUTH_SERVER_URL}/callback`,
    scope:         'read:user user:email',
    response_type: 'code',
  });

  return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ---------------------------------------------------------------------------
// Step 2: GitHub OAuth callback → return SpacetimeDB token
// ---------------------------------------------------------------------------

app.get('/callback', async (c) => {
  const code  = c.req.query('code');
  const error = c.req.query('error');

  if (error || !code) {
    const reason = c.req.query('error_description') ?? error ?? 'unknown';
    return c.redirect(`${CLIENT_CALLBACK_URL}?error=${encodeURIComponent(reason)}`);
  }

  // Exchange code for GitHub access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method:  'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      client_id:     GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri:  `${AUTH_SERVER_URL}/callback`,
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
        Accept:        'application/vnd.github.v3+json',
        'User-Agent':  'lcr-auth',
      },
    }),
    fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept:        'application/vnd.github.v3+json',
        'User-Agent':  'lcr-auth',
      },
    }),
  ]);

  if (!profileRes.ok) {
    return c.redirect(`${CLIENT_CALLBACK_URL}?error=profile_fetch_failed`);
  }

  const profile = await profileRes.json() as {
    id:         number;
    login:      string;
    name?:      string;
    avatar_url: string;
    email?:     string;
  };

  let email = profile.email ?? '';
  if (!email && emailRes.ok) {
    const emails = await emailRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
    email = emails.find(e => e.primary && e.verified)?.email ?? emails[0]?.email ?? '';
  }

  const githubId = String(profile.id);

  // Reuse existing SpacetimeDB token if we have one for this GitHub user
  let stdbToken = getToken(githubId);

  if (!stdbToken) {
    // Request a new anonymous identity from SpacetimeDB
    const identityRes = await fetch(`${SPACETIMEDB_URL}/v1/identity`, { method: 'POST' });
    if (!identityRes.ok) {
      console.error('[auth] SpacetimeDB /v1/identity failed:', identityRes.status, await identityRes.text());
      return c.redirect(`${CLIENT_CALLBACK_URL}?error=stdb_identity_failed`);
    }
    const identityData = await identityRes.json() as { identity: string; token: string };
    stdbToken = identityData.token;
    setToken(githubId, stdbToken);
  }

  // Pass the SpacetimeDB token + GitHub profile back to the client
  const params = new URLSearchParams({
    token:      stdbToken,
    github_id:  githubId,
    username:   profile.login,
    name:       profile.name ?? profile.login,
    avatar_url: profile.avatar_url,
    email,
  });

  return c.redirect(`${CLIENT_CALLBACK_URL}?${params}`);
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const port = parseInt(process.env.PORT ?? '4000');
console.log(`Auth server listening on port ${port}`);
console.log(`  SpacetimeDB: ${SPACETIMEDB_URL}`);
console.log(`  Client callback: ${CLIENT_CALLBACK_URL}`);

export default {
  port,
  fetch: app.fetch,
};
