import { NextResponse, type NextRequest } from "next/server";
import { WHOOP_AUTH_URL, WHOOP_SCOPE, whoopEnv } from "@/lib/whoop/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start the WHOOP OAuth flow: set a CSRF state cookie ON the redirect response
 *  → redirect to consent. (Setting it on the response is what guarantees the
 *  Set-Cookie header actually ships with the 3xx.) */
export async function GET(request: NextRequest) {
  const { clientId, redirectUri } = whoopEnv();
  if (!clientId || !redirectUri) {
    console.error("[whoop] authorize: missing WHOOP_CLIENT_ID / WHOOP_REDIRECT_URI");
    return NextResponse.redirect(new URL("/today?whoop=unconfigured", request.url));
  }

  const state = crypto.randomUUID();
  const url = new URL(WHOOP_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", WHOOP_SCOPE);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set("whoop_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
