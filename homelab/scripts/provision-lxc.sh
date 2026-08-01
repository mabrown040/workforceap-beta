#!/usr/bin/env bash
# Provision an LXC container on Proxmox for WorkforceAP (Docker Compose stack).
# Run on the Proxmox host (e.g. pve-ha).
#
# Usage:
#   CTID=153 bash homelab/scripts/provision-lxc.sh
#
# Defaults: CT 153, Ubuntu 24.04, 2 vCPU, 4 GB RAM, 32 GB disk.

set -euo pipefail

CTID="${CTID:-153}"
TEMPLATE="${TEMPLATE:-local:vztmpl/ubuntu-24.04-standard_24.04-1_amd64.tar.zst}"
HOSTNAME="${HOSTNAME:-workforceap-app}"
CORES="${CORES:-2}"
MEMORY="${MEMORY:-4096}"
SWAP="${SWAP:-512}"
DISK="${DISK:-32}"
BRIDGE="${BRIDGE:-vmbr0}"
REPO="${REPO:-https://github.com/mabrown040/workforceap-beta.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/workforceap}"

if ! command -v pct >/dev/null 2>&1; then
  echo "pct not found — run this script on a Proxmox host." >&2
  exit 1
fi

if pct status "$CTID" >/dev/null 2>&1; then
  echo "CT $CTID already exists. Start it and run homelab/scripts/deploy.sh inside." >&2
  exit 1
fi

echo "Creating CT $CTID ($HOSTNAME)..."
pct create "$CTID" "$TEMPLATE" \
  --hostname "$HOSTNAME" \
  --cores "$CORES" \
  --memory "$MEMORY" \
  --swap "$SWAP" \
  --rootfs "local-lvm:${DISK}" \
  --features nesting=1 \
  --net0 "name=eth0,bridge=${BRIDGE},ip=dhcp"

pct start "$CTID"
sleep 12

CT_IP="$(pct exec "$CTID" -- hostname -I | awk '{print $1}')"
echo "Container IP: $CT_IP"

pct exec "$CTID" -- bash -s <<EOF
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker

mkdir -p ${INSTALL_DIR}
git clone ${REPO} ${INSTALL_DIR}
cd ${INSTALL_DIR}
cp homelab/.env.example homelab/.env
EOF

echo ""
echo "=== CT $CTID ready ==="
echo "IP: $CT_IP"
echo ""
echo "Next steps:"
echo "  1. pct exec $CTID -- bash"
echo "  2. Edit ${INSTALL_DIR}/homelab/.env (Supabase, secrets, POSTGRES_PASSWORD)"
echo "  3. cd ${INSTALL_DIR} && bash homelab/scripts/deploy.sh"
echo "  4. Point Caddy at ${CT_IP}:${WEB_PORT:-3000} (see homelab/Caddyfile)"
