#!/bin/bash
# WorkforceAP Deployment Script for Proxmox
# Run this on pve-ha host

set -e

echo "=== WorkforceAP Container Setup ==="
echo ""

# Create LXC Container 152
echo "Creating CT 152..."
pct create 152 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname workforceap-web \
  --cores 1 \
  --memory 512 \
  --swap 512 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp

# Start container
pct start 152

# Wait for network
echo "Waiting for network..."
sleep 10

# Get container IP
CT_IP=$(pct exec 152 -- hostname -I | awk '{print $1}')
echo "Container IP: $CT_IP"

# Install nginx inside container
echo "Installing nginx..."
pct exec 152 -- bash -c "
apt update
apt install -y nginx git
mkdir -p /var/www/workforceap
chown -R www-data:www-data /var/www/workforceap
"

# Configure nginx
echo "Configuring nginx..."
pct exec 152 -- bash -c "cat > /etc/nginx/sites-available/workforceap << 'EOF'
server {
    listen 80;
    server_name workforceap.mikeslabs.com;
    root /var/www/workforceap;
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }

    gzip on;
    gzip_types text/css application/javascript text/html;
}
EOF
"

# Enable site
pct exec 152 -- bash -c "
ln -sf /etc/nginx/sites-available/workforceap /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
"

echo ""
echo "=== Container 152 Ready ==="
echo "IP: $CT_IP"
echo ""
echo "Next steps:"
echo "1. Clone/pull the site: git clone https://github.com/mabrown040/workforceap-beta /var/www/workforceap"
echo "2. Update Caddy reverse proxy to point to $CT_IP:80"
echo "3. Update DNS for workforceap.mikeslabs.com"
