# Stitch MCP Protocol — WorkforceAP

## Tool
`stitch-mcp` — installed globally at `/home/claw/.nvm/.../bin/stitch-mcp`

## Auth
Set env var: `STITCH_API_KEY="AQ...."` (bearer token from Google session)

To get a fresh token:
1. Open https://stitch.withgoogle.com/projects/18255988866302206897 in browser
2. DevTools → Network tab
3. Trigger any action
4. Find request with `Authorization: Bearer AQ...`
5. Copy the value after `Bearer `

Check health: `STITCH_API_KEY="..." stitch-mcp doctor`

## Project
Project ID: `18255988866302206897`

## Commands

### List all screens (51 total)
```bash
STITCH_API_KEY="..." stitch-mcp tool list_screens \
  -d '{"projectId":"18255988866302206897"}' \
  -o json
```
Returns array with `title`, `name` (contains screenId), `deviceType`, `htmlCode.downloadUrl`

### Download a screen's HTML
```bash
STITCH_API_KEY="..." stitch-mcp tool get_screen_code \
  -d '{"projectId":"18255988866302206897","screenId":"<screenId>"}' \
  -o json | python3 -c "import sys,json; d=json.load(sys.stdin); open('output.html','w').write(d.get('htmlContent',''))"
```
⚠️ Must use `-o json` and extract `htmlContent` key. The default `-o raw` gives JS object syntax, not JSON.

### Interactive viewer (requires PTY)
```bash
# Needs exec with pty:true — not usable from non-TTY context
stitch-mcp screens -p 18255988866302206897
```

## Screen IDs (key screens)
| Title | Screen ID | Device |
|---|---|---|
| Member Dashboard (Mobile) | 38e8e5b42c7749078dbe6e558254bf57 | MOBILE |
| Home (Mobile) | 976948abc4d946c2a5f2ebba4e1c0137 | MOBILE |
| Programs Catalog (Mobile) | a3396c18b8404dd8af665d5d5e152f28 | MOBILE |
| Apply Flow (Desktop) | 512cea822543451ebe887c8aa7305960 | DESKTOP |
| Signup (Desktop) | 794ee4cea13b4b58a40bd2bf3e381a99 | DESKTOP |
| Login (Desktop) | 635d950a6cc14ad3891d2bd4e8ca9d85 | DESKTOP |

Run `stitch-mcp tool list_screens -d '{"projectId":"18255988866302206897"}' -o json` for full list.

## Notes
- Token expires — run doctor to check, get fresh from browser if 401
- `screens` interactive command needs PTY
- All tools work non-interactively via `stitch-mcp tool <toolName> -d <json> -o json`
