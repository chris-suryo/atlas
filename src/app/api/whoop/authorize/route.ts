import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { WHOOP_AUTH_URL, WHOOP_SCOPE, whoopEnv } from "@/lib/whoop/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start the WHOOP OAuth flow: set a CSRF state cookie → redirect to consent. */
export async function GET(request: NextRequest) {
  const { clientId, redirectUri } = whoopEnv();
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/today?whoop=unconfigured", request.url));
  }

  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set("whoop_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const url = new URL(WHOOP_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", WHOOP_SCOPE);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
