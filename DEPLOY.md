# WorkforceAP Deployment

Production deploys run on **Vercel** (automatic on push to `master`).

For **self-hosted Proxmox homelab** deployment (`workforceap.mikeslabs.com`), see:

**[homelab/README.md](./homelab/README.md)**

That guide covers LXC provisioning, Docker Compose (Postgres + Next.js), Caddy reverse proxy, and secrets.

## Legacy note

Older docs in this file described a static HTML/nginx setup (CT 152). The app is now a full Next.js stack — use `homelab/` instead.
