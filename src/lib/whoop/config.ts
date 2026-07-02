// WHOOP v2 constants + env accessors. Secrets are read from process.env
// (Vercel-only, never committed) and never logged.

export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_API_BASE = "https://api.prod.whoop.com";

// `offline` is required to receive a (rotating) refresh token, and must be
// re-requested on every refresh to keep getting one.
export const WHOOP_SCOPE =
  "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline";

export function whoopEnv() {
  // Trim: a trailing newline/space on a pasted secret is a common cause of
  // 401 invalid_client at the token endpoint.
  return {
    clientId: (process.env.WHOOP_CLIENT_ID ?? "").trim(),
    clientSecret: (process.env.WHOOP_CLIENT_SECRET ?? "").trim(),
    redirectUri: (process.env.WHOOP_REDIRECT_URI ?? "").trim(),
  };
}

export function whoopConfigured(): boolean {
  const e = whoopEnv();
  return Boolean(e.clientId && e.clientSecret && e.redirectUri);
}
