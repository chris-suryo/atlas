# Atlas — WHOOP Phase-1 (Ingest) Integration Spec

**Version 1.0 · scope: INGEST ONLY.** Connect WHOOP, receive its data, land it in tables, show it in-app. No recommendation engine, no Today screen, no push notifications — those are later phases that consume what this builds.

Host: **Vercel** (route handlers + Vercel Cron), tokens in Supabase. Same repo as the app.

> **Build status (M1 ingest — SHIPPED):** OAuth connect (`/api/whoop/authorize`+`/callback`),
> rotating-refresh token store (`whoop_connection`, migration `…0008`), fetch+map
> recovery·sleep·cycle → `recovery` **anchored to the Boston-local cycle-start date**
> (`src/lib/whoop/*`), a **daily** Vercel Cron (`/api/cron/whoop`, `CRON_SECRET`) + manual
> **Sync**/**Disconnect**, and Today's rings/trend + the §7.3 recovery modifier now live.
> Local-day anchoring and the v2 `start`/`nextToken` params were filled in (the spec left them
> undefined). **Fast-follow (not built):** §5 webhooks, run→import, body-weight, ring detail pages.

---

## 0. Prerequisites (human step — Chris only)

Claude Code cannot do this; it needs Chris's WHOOP login:

1. At `developer.whoop.com` → create a Team, then an **App**.
2. Set **Redirect URI** = `https://atlas-puce-gamma.vercel.app/api/whoop/callback`.
3. Set **Webhook URL** = `https://atlas-puce-gamma.vercel.app/api/whoop/webhook`, model version **v2**.
4. Request scopes: `offline read:recovery read:cycles read:sleep read:workout read:body_measurement read:profile`.
5. Copy **Client ID** and **Client Secret** into Vercel env (below).

Notes: the developer platform is **free** (requires the WHOOP membership Chris already has); under 10 users needs no app approval. v1 is dead — **use v2 only** (base `https://api.prod.whoop.com`).

---

## 1. Environment variables (Vercel)
```
WHOOP_CLIENT_ID=…
WHOOP_CLIENT_SECRET=…
WHOOP_REDIRECT_URI=https://atlas-puce-gamma.vercel.app/api/whoop/callback
CRON_SECRET=…            # guards the cron routes
SUPABASE_SERVICE_ROLE_KEY=…   # server-only; token table is service-role access
```

---

## 2. Data model additions (one migration)

**New table `whoop_connection`** (one row for the user; service-role access only, no anon RLS select — it holds secrets):
`id, user_id (unique), whoop_user_id, access_token, refresh_token, expires_at timestamptz, scopes text, created_at, updated_at`.
Store tokens encrypted if practical (Supabase Vault / pgsodium); at minimum, the table is never exposed to the anon key.

**Extend `runs` and `workouts`** for idempotent import + dedup:
- `workouts.whoop_id uuid null unique` (the WHOOP workout UUID), `workouts.source` already exists (`'manual'` | `'whoop'`).
- This lets webhook re-deliveries **upsert** instead of duplicate.

**`recovery`** (already stubbed) is populated by this integration — no schema change; just wire it.

---

## 3. OAuth connect flow (authorization code)

Routes:
- `GET /api/whoop/connect` → build the WHOOP authorize URL and redirect:
  `https://api.prod.whoop.com/oauth/oauth2/auth?client_id=…&redirect_uri=…&response_type=code&scope=offline%20read:recovery%20read:cycles%20read:sleep%20read:workout%20read:body_measurement%20read:profile&state=<csrf>`
  (An in-app "Connect WHOOP" button hits this.)
- `GET /api/whoop/callback` → verify `state`, exchange `code` at `POST https://api.prod.whoop.com/oauth/oauth2/token` (grant_type=authorization_code), store `access_token`, `refresh_token`, `expires_at`, `whoop_user_id` in `whoop_connection`. Then trigger an initial backfill (§6 reconciliation, last ~30 days).

`offline` scope is **required** to receive a refresh token at all.

---

## 4. Token storage & rotating refresh (the one real trap)

WHOOP **rotates the refresh token on every refresh** — each exchange returns a *new* refresh token and immediately invalidates the old one. Concurrent refreshes will 401 the loser and can brick the connection. Handle atomically:

```
refreshIfNeeded(userId):
  BEGIN
    row = SELECT * FROM whoop_connection WHERE user_id=userId FOR UPDATE   -- row lock
    if row.expires_at > now()+60s: COMMIT; return row.access_token          -- someone else refreshed
    resp = POST /oauth/oauth2/token (grant_type=refresh_token,
             refresh_token=row.refresh_token, scope=offline, client_id, client_secret)
    UPDATE whoop_connection SET access_token=resp.access_token,
             refresh_token=resp.refresh_token,           -- STORE THE NEW ONE
             expires_at=now()+resp.expires_in
    COMMIT
  return resp.access_token
```
Access tokens last ~1 hour. Always request `scope=offline` on refresh too, so you keep getting a rotated refresh token.

---

## 5. Webhook receiver — `POST /api/whoop/webhook`

Body: `{ user_id, id (UUID), type, trace_id }`. Types: `workout.updated`, `sleep.updated`, `recovery.updated`. (Recovery webhooks carry the **sleep UUID**, not the cycle id.)

**Verify the signature before trusting anything.** Headers `X-WHOOP-Signature` + `X-WHOOP-Signature-Timestamp`:
```
expected = base64( HMAC_SHA256( timestampHeader + rawRequestBody, WHOOP_CLIENT_SECRET ) )
if expected !== signatureHeader: return 401   // drop
```
Use the **raw** body bytes (disable body parsing / read the raw stream) or the HMAC won't match.

Flow: verify → return **2xx immediately** → then (background, via `waitUntil`) resolve the token, GET the resource by UUID, upsert (§7). WHOOP retries a failed delivery 5× over ~1 hour, so fast 2xx matters. Webhooks can be missed → the reconciliation cron (§8) is the safety net.

---

## 6. Field → table mapping

| Source (WHOOP v2) | → Atlas | Notes |
|---|---|---|
| `GET /v2/recovery` → `score.recovery_score` | `recovery.recovery_pct` | 0–100 |
| `score.hrv_rmssd_milli` | `recovery.hrv` | ms (RMSSD) |
| `score.resting_heart_rate` | `recovery.rhr` | bpm |
| `GET /v2/activity/sleep` → sleep performance % | `recovery.sleep_perf` | |
| sleep total asleep duration | `recovery.sleep_hours` | seconds → hours |
| `GET /v2/cycle` → day strain | `recovery.strain` | 0–21; final after midnight |
| — (assemble by date) | one `recovery` row/day | **upsert on `(user_id, date)`** |
| `GET /v2/activity/workout` (sport=running) | `workouts(type=run, source='whoop', whoop_id=UUID)` + `runs` | see below |
| workout `start`/`end` | `runs.duration_sec` | |
| `score.distance_meter` | `runs.distance_miles` | m → mi (present only if GPS-recorded) |
| `score.altitude_gain_meter` | `runs.elevation_gain_ft` | m → ft |
| `score.average_heart_rate` / `max_heart_rate` | `runs.avg_hr` / `max_hr` | |
| (distance ÷ duration) | `runs.pace_min_per_mile` | computed |
| `GET /v2/user/measurement/body` → weight_kg | `body_metrics.weight_lbs` | kg → lb; `source='whoop'`; bonus auto weigh-in |

Recovery is assembled per **date** from three endpoints (recovery + sleep + cycle) → one upserted row. WHOOP's own zones are green 67–100 / yellow 34–66 / red 0–33; Atlas keeps Chris's custom bands (0–30 / 30–70 / 70+) — that mapping lives in the later recommendation phase, **not here**.

**Ankle fields stay null on import** (`ankle_pain_0_10`, `lateral_tightness_0_10`, `symptom_trend`) — Chris fills those in-app. That's the whole point: WHOOP does the objective, he does the subjective.

---

## 7. What NOT to ingest

- **Do not import WHOOP strength workouts** (`weightlifting`) as `workouts` — Chris logs those manually with per-exercise/set detail WHOOP doesn't have. Importing would duplicate. Filter WHOOP workouts by sport: `running` → runs; `cycling`/`mountain biking` → optional cardio row (later); **skip weightlifting**.
- No continuous HR series (WHOOP API doesn't expose it), no GPS route polyline (not in the API).

---

## 8. Cron jobs (Vercel Cron → guarded routes)

1. **Token refresh** — `GET /api/whoop/cron/refresh` every ~45 min: proactively refresh if `expires_at` is near. (Belt-and-suspenders; refresh also happens on-demand in §4.)
2. **Reconciliation** — `GET /api/whoop/cron/sync` every few hours: pull recent recovery/sleep/workout/body since `last_synced_at` and upsert, to catch any missed webhooks. Both routes check `CRON_SECRET`.

Rate limits are generous for one user — 100 req/min, 10,000/day per client.

---

## 9. Verification

- Connect flow stores tokens; disconnect (revoke) clears them.
- Force an expiry → confirm rotating refresh updates both tokens and doesn't 401 on the next call.
- Signature check rejects a tampered body (flip one byte → 401).
- Log a run on WHOOP → within ~minutes a `runs` row appears with duration/HR/(distance if GPS), ankle fields null; re-delivery does **not** duplicate (upsert on `whoop_id`).
- After a night's sleep → a `recovery` row for that date with recovery_pct/hrv/rhr/sleep_perf populated.
- A strength workout on WHOOP does **not** create an Atlas workout.

---

## 10. Out of scope (later phases, consume this)
- Recovery-aware "what to do today" recommendation (Today screen) — uses `recovery` bands.
- Morning push notification (web push, iOS A2HS).
- Run auto-classification (easy/quality/long) from HR zones/strain.
- Sleep-debt / HRV-baseline trends (Trends screen).
```
