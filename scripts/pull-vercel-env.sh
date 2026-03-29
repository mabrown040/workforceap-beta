#!/usr/bin/env bash
set -euo pipefail

environment="${1:-preview}"
output_file="${2:-.env.${environment}.local}"

case "$environment" in
  development|preview|production)
    ;;
  *)
    echo "Unsupported Vercel environment: $environment" >&2
    echo "Use one of: development, preview, production" >&2
    exit 1
    ;;
esac

echo "[vercel env pull] environment=$environment output=$output_file"
vercel env pull "$output_file" --environment="$environment"
