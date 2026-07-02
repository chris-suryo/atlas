import { WHOOP_TOKEN_URL, whoopEnv } from "./config";

export type WhoopToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
};
export type TokenExchange =
  | { ok: true; token: WhoopToken; method: string }
  | { ok: false; status: number; body: string; method: string };

async function attempt(
  useBasic: boolean,
  grant: Record<string, string>,
): Promise<Response> {
  const { clientId, clientSecret } = whoopEnv();
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const body: Record<string, string> = { ...grant };
  if (useBasic) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  } else {
    body.client_id = clientId;
    body.client_secret = clientSecret;
  }
  return fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers,
    cache: "no-store",
    body: new URLSearchParams(body),
  });
}

/**
 * Exchange an authorization_code or refresh_token for WHOOP tokens. Tries
 * client_secret_post (creds in body) first, then client_secret_basic (creds in
 * the Authorization header) on a 401 — so it works whichever method WHOOP wants.
 * `grant` carries grant_type + code/refresh_token/redirect_uri/scope (no creds).
 */
export async function whoopTokenExchange(
  grant: Record<string, string>,
): Promise<TokenExchange> {
  let res = await attempt(false, grant);
  let method = "post";
  if (!res.ok && res.status === 401) {
    res = await attempt(true, grant);
    method = "basic";
  }
  if (res.ok) {
    return { ok: true, token: (await res.json()) as WhoopToken, method };
  }
  const body = await res.text().catch(() => "");
  return { ok: false, status: res.status, body, method };
}
