# WorkforceAP Static Site Deployment

## Overview
Static HTML/CSS/JS replica of the Squarespace site for hosting on `workforceap.mikeslabs.com`

## Project Structure
```
workforceap-static/
├── index.html          # Homepage
├── css/
│   └── main.css        # All styles
├── js/
│   └── main.js         # Mobile nav + smooth scroll
├── images/             # Site images (add as needed)
└── DEPLOY.md           # This file
```

## Deployment Steps

### 1. On Your Proxmox Host (pve-ha)

Create a new LXC container for the static site:

```bash
# Create CT (adjust ID as needed)
pct create 152 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname workforceap-web \
  --cores 1 \
  --memory 512 \
  --swap 512 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp

# Start the container
pct start 152

# Enter the container
pct exec 152 bash
```

### 2. Inside the Container

```bash
# Update and install nginx
apt update
apt install -y nginx rsync

# Create web directory
mkdir -p /var/www/workforceap
chown -R www-data:www-data /var/www/workforceap

# Configure nginx
cat > /etc/nginx/sites-available/workforceap << 'EOF'
server {
    listen 80;
    server_name workforceap.mikeslabs.com;
    root /var/www/workforceap;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript text/html;
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/workforceap /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 3. Deploy the Files

From this machine (where the static site is built):

```bash
# Copy files to the container
rsync -avz /home/claw/.openclaw/workspace/projects/workforceap-static/ \
  root@192.168.1.X:/var/www/workforceap/

# Replace 192.168.1.X with the actual IP of CT 152
```

Or if using GitHub Actions for auto-deploy, add this to your workflow.

### 4. Caddy Reverse Proxy (on your existing Caddy/Traefik container)

Add to your Caddyfile:

```
workforceap.mikeslabs.com {
    reverse_proxy 192.168.1.X:80
    # Auto SSL via Let's Encrypt
}
```

Reload Caddy:
```bash
caddy reload
```

### 5. DNS

Point `workforceap.mikeslabs.com` to your homelab public IP via:
- Cloudflare (recommended, hides your IP)
- Or direct A record

## Next Pages to Build

1. `/how-it-works.html` - Full 13-step process flow
2. `/programs.html` - Program listings
3. `/apply.html` - Application form
4. `/contact.html` - Contact form
5. `/faq.html` - FAQ page
6. `/what-we-do.html` - About page
7. `/leadership.html` - Team page

## Development

To preview locally:
```bash
cd /home/claw/.openclaw/workspace/projects/workforceap-static
python3 -m http.server 8000
# Open http://localhost:8000
```

## GitHub Auto-Deploy (Optional)

Add `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Homelab
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to homelab
        run: |
          rsync -avz --delete . root@YOUR-HOMELAB-IP:/var/www/workforceap/
```
