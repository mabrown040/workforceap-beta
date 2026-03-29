# Stitch Refresh Protocol

This doc explains how to refresh Stitch API access when the current token expires.

## Project + Session Reference

- **Stitch Project ID:** `18255988866302206897`
- **Current known session token pattern:** OAuth Bearer token starting with `AQ...`

> Important: do **not** commit live bearer tokens to git or paste them in shared channels.

---

## Quick Refresh Checklist

1. Open Stitch in a browser while logged into the correct Google account.
2. Open DevTools (Network tab).
3. Perform an action in Stitch (e.g., open project, generate/update a screen).
4. Find a request to Stitch APIs that includes an `Authorization` header.
5. Copy the bearer token value from:
   - `Authorization: Bearer AQ...`
6. Validate token format:
   - Starts with `AQ`
   - Long opaque string (OAuth bearer)
7. Use it for API calls as:
   - `Authorization: Bearer <TOKEN>`
8. Store token only in local secure env vars/session, not in repo files.

---

## Detailed Steps

## 1) Get a fresh token

- Navigate to: `https://stitch.withgoogle.com/projects/18255988866302206897`
- In browser DevTools:
  - Go to **Network**
  - Filter by `fetch` / `xhr`
  - Trigger a Stitch action (open canvas, regenerate, etc.)
- Click a request to Stitch backend and inspect **Request Headers**.
- Copy the value after `Bearer ` from `Authorization`.

## 2) Export locally (example)

```bash
export STITCH_BEARER_TOKEN='AQ...'
```

## 3) Use token in API requests (example)

```bash
curl 'https://stitch.withgoogle.com/_/BardChatUi/data/batchexecute?rpcids=...' \
  -H "Authorization: Bearer ${STITCH_BEARER_TOKEN}" \
  -H 'Content-Type: application/x-www-form-urlencoded;charset=UTF-8' \
  --data-raw 'f.req=...'
```

(Endpoint/rpcids payload vary by request type.)

## 4) Expiry behavior and recovery

Common expired-token signals:
- `401 Unauthorized`
- `403 Forbidden`
- Empty/failed Stitch API responses where auth is required

Recovery:
- Repeat Step 1 and replace local token.
- Re-run request with new bearer token.

---

## Security + Handling Rules

- Never commit token strings to `.stitch/` or source files.
- Never log full token values in CI output.
- Prefer short-lived shell/session env vars.
- If token leaks, rotate by obtaining a fresh token and invalidate old sessions (logout/login).

---

## Screen ID Map (for future Stitch API access)

Session/project context:
- **Project ID / Session Context:** `18255988866302206897`

Generated mobile screens currently in `.stitch/`:

| File | Screen ID |
|---|---|
| `mobile-homepage-light.html` | `b82d6493702e43ee972aa9554cef8797` |
| `mobile-programs.html` | `5aa286c3fd5f4cdab419d2be3177430c` |
| `mobile-apply.html` | `1673a5645e784765847abf6abf660f25` |
| `mobile-quiz.html` | `9e3b346b77d14be18020ce6bee91cf62` |

Use this map when crafting Stitch API calls for read/update/regenerate operations.
