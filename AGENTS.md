# AGENTS.md

## Cursor Cloud specific instructions

This is a **zero-dependency static website** (plain HTML/CSS/JS). There is no build step, no package manager, no linter, and no automated test suite.

### Running the dev server

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. All HTML pages use absolute paths (e.g. `/css/main.css`, `/images/logo.png`), so a proper HTTP server is required — opening files directly via `file://` will break asset loading.

### Project structure

- 10 HTML pages in the repo root (`index.html`, `apply.html`, `programs.html`, etc.)
- `css/main.css` — all styles
- `js/main.js` — mobile nav toggle and smooth scrolling only
- `images/` — static assets
- `Caddyfile` — production reverse-proxy config (not needed for local dev)
- `DEPLOY.md` — production deployment instructions (Proxmox/Nginx/Caddy)

### Lint / Test / Build

There are no configured linters, test frameworks, or build tools. For HTML validation, use an external tool like `html5validator` if needed (not pre-installed). CSS and JS are vanilla with no transpilation.
