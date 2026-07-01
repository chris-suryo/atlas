import { WHOOP_API_BASE } from "./config";

/** GET a WHOOP v2 resource as JSON (Bearer auth, never cached). */
export async function whoopGet<T>(
  token: string,
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(WHOOP_API_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`WHOOP ${path} → ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Fetch all pages of a WHOOP v2 collection (`{ records, next_token }`),
 * following `nextToken` up to `max` records.
 */
export async function whoopList<T>(
  token: string,
  path: string,
  params: Record<string, string> = {},
  max = 60,
): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined;
  do {
    const page = await whoopGet<{ records?: T[]; next_token?: string }>(token, path, {
      ...params,
      limit: "25",
      ...(next ? { nextToken: next } : {}),
    });
    out.push(...(page.records ?? []));
    next = page.next_token;
  } while (next && out.length < max);
  return out;
}
