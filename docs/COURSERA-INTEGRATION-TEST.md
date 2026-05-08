# Coursera Integration Test Runner

End-to-end probe for the three Coursera credential surfaces that touch
WorkforceAP. Lives at `scripts/coursera-integration-test.ts` and is wired up as
`npm run coursera:test`. Admin-only — never run from CI.

## What it does

The runner verifies all three credential paths actually work and reports the
shape of the data each one returns, so we can decide whether to extend the
B4B puller or rely on inbound xAPI alone.

1. **(a) Inbound xAPI — pretend to be Coursera.**
   `POST /api/xapi/oauth/token` (form-encoded `grant_type=client_credentials` +
   `client_id` / `client_secret`) on the target host, then `POST` a sample
   ADL-shaped xAPI statement to `/api/xapi/statements` with the resulting
   `Authorization: Bearer …`. Confirms the inbound surface actually accepts
   what Coursera will send in production.
2. **(b) Outbound For Business API.**
   Exchanges the dev app's B4B client_id/secret at
   `https://api.coursera.com/oauth2/client_credentials/token` and reports the
   granted scopes.
3. **(c) Reverse-engineer reachable endpoints.**
   Probes a list of common Coursera For Business REST endpoints
   (`/api/businesses.v1/orgs/<id>`, `/learners`, `/programs`, `/enrollments`,
   `/completions`, `contents.search`, plus the legacy
   `/ent/api/rest/v1/enterprise/programs`) so you can see which ones return
   200 vs 401/403/404 with the dev app's current product entitlements.
4. **(d) Extras.**
   Tries an LRS-style `GET /xAPI/statements?limit=1` retrieval surface in case
   Coursera exposes one — would let us backfill statements we missed — and
   echoes the OAuth `scope` field.

The script never logs raw secret values: client IDs are obfuscated and
access tokens are truncated.

## Required environment variables

The script reads everything from env. None of these values should ever be
written into a config file checked into the repo.

| Variable | What it is | Where to fetch it |
| --- | --- | --- |
| `COURSERA_XAPI_CLIENT_ID` | The xAPI client ID **Coursera uses to call us**. Same value Coursera enters in their xAPI provider config; we accept it at `/api/xapi/oauth/token`. On our server side this is `XAPI_CLIENT_ID` (falls back to `COURSERA_APP_ID`). | Coursera For Business admin → xAPI Provider → "WorkforceAP Standard" → Client ID. Or copy the value WorkforceAP's `XAPI_CLIENT_ID` env is set to. |
| `COURSERA_XAPI_CLIENT_SECRET` | Matching xAPI secret. Server-side env name is `XAPI_CLIENT_SECRET` (falls back to `COURSERA_APP_SECRET` then `COURSERA_WEBHOOK_SECRET`). | Same Coursera xAPI Provider config. Treat as a high-value secret. |
| `COURSERA_B4B_CLIENT_ID` | Dev-app key we use to call Coursera's For Business REST API. | dev.coursera.com → "WorkforceAP" app → OAuth Credentials → Client ID. |
| `COURSERA_B4B_CLIENT_SECRET` | Matching B4B client secret. | Same dev.coursera.com app page — only shown once at creation; rotate if lost. |

## Optional environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `COURSERA_TARGET_BASE_URL` | `http://localhost:3000` | Host the inbound test points at. Set to your Vercel preview URL to test stage, or `https://www.workforceap.org` to test prod. |
| `COURSERA_ORG_ID` | `8R2W4McwOMWJp9cCBV1kvw` | Workforce Advancement Project's Coursera org ID. |
| `COURSERA_ORG_SLUG` | `workforce-advancement` | Used as a fallback path segment in some probes. |
| `COURSERA_OAUTH_TOKEN_URL` | `https://api.coursera.com/oauth2/client_credentials/token` | Coursera's outbound OAuth endpoint. |
| `COURSERA_API_BASE_URL` | `https://api.coursera.com/ent` | Base for B4B endpoint probes. |

If all four required variables are absent, the script exits with code 2 and
prints which ones are missing. If only one of the two pairs is set, the script
runs the section it has credentials for and skips the other.

## Running

### Local

```bash
# 1. Start the Next.js server in another shell so /api/xapi/* is reachable
npm run dev

# 2. Export creds (do NOT commit these). Use a 1Password CLI or a local
#    .env file you load manually — never check the values in.
export COURSERA_XAPI_CLIENT_ID=...
export COURSERA_XAPI_CLIENT_SECRET=...
export COURSERA_B4B_CLIENT_ID=...
export COURSERA_B4B_CLIENT_SECRET=...

# 3. Run
npm run coursera:test
```

### Vercel preview / stage

```bash
export COURSERA_TARGET_BASE_URL=https://workforceap-git-<branch>.vercel.app
# ... same exports as above
npm run coursera:test
```

The inbound xAPI section will hit the Vercel-deployed Next.js handlers; the
outbound section calls `api.coursera.com` directly from the runner's machine,
so it works the same regardless of `COURSERA_TARGET_BASE_URL`.

### Production

Only run if you genuinely intend to send a synthetic xAPI statement at the
prod LRS pipeline. The sample actor is `integration-test@workforceap.org` and
the sample object is `https://www.coursera.org/learn/integration-test-course`,
which will not match any real member or enrolled course, so it should land in
the persistence layer without triggering a member completion. Still, prefer
preview.

## Interpreting failures — troubleshooting

### `(a) inbound /api/xapi/oauth/token` returns 503 with `xAPI auth is not configured`
The target server does not have `XAPI_CLIENT_ID` and `XAPI_CLIENT_SECRET`
(or one of the documented fallbacks `COURSERA_APP_ID` / `COURSERA_APP_SECRET`
/ `COURSERA_WEBHOOK_SECRET`) set. Set them on the target deployment's env
and redeploy.

### `(a) inbound oauth/token` returns 401 `invalid_client`
The credentials you put in `COURSERA_XAPI_CLIENT_ID` /
`COURSERA_XAPI_CLIENT_SECRET` do not match the values stored on the target
server. Either:
- you exported the wrong values into your shell, or
- the server-side env is stale.
Reconcile the two.

### `(a) inbound /api/xapi/statements` returns 401 with valid token
Token signature verification failed — most likely the server-side
`XAPI_CLIENT_SECRET` rotated between the OAuth call and the statement call.
Restart the Next.js dev server so it picks up the latest env, or redeploy.

### `(a) inbound /api/xapi/statements` returns 200 but `processed=0`
The statement was persisted but couldn't be matched to a known member /
enrolled course (expected for the synthetic test actor). Check
`lib/xapi/inboundStatementPipeline.ts` for the matcher logic. Not a failure
of the OAuth/ingest surface itself.

### `(b) outbound POST /oauth2/client_credentials/token` returns 401
The B4B client ID/secret are wrong, or the dev.coursera.com "WorkforceAP" app
has had OAuth Credentials revoked. Regenerate the secret in dev.coursera.com.

### `(b) outbound` returns 200 but `(c)` endpoints all 401/403
The dev app authenticated but does **not** have the For Business API product
enabled, or the org ID does not belong to it. In dev.coursera.com, open the
"WorkforceAP" app and make sure "Coursera For Business API" is added to the
products list. Cross-check the granted `scope` value reported by `(b)`
against what each endpoint requires.

### `(b) outbound` returns 200 but `(c)` endpoints all 404
The product is enabled but Coursera's REST surface does not match the URL
shape we guessed. Add the actual URL from Coursera's docs to
`buildEndpointCatalog` in `scripts/coursera-integration-test.ts` and re-run.

### Network errors / `fetch failed`
If running against `localhost:3000`, ensure `npm run dev` is up. If the
outbound call to `api.coursera.com` fails, confirm your machine has
unrestricted egress (some sandboxed CI runners cannot reach Coursera).

## What the script does NOT do

- It does not load or print any secrets from a file. All secrets come from
  the live shell env at invocation time.
- It does not run in CI. Add no GitHub Action for it.
- It does not modify any persistent state on Coursera's side. The B4B section
  is read-only.
- It does send one synthetic xAPI statement to the target's persistence layer
  on each successful inbound run. Use a non-prod target unless you have
  cleared this with ops.
