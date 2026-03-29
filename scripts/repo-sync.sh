#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
remote="${1:-origin}"
branch="${2:-$(git -C "$repo_root" branch --show-current)}"

if [[ -z "$branch" ]]; then
  echo "Could not determine current branch." >&2
  exit 1
fi

cd "$repo_root"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Not a git repository: $repo_root" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Tracked changes detected. Commit/stash first before sync." >&2
  exit 1
fi

echo "[repo-sync] fetching $remote"
git fetch --prune "$remote"

current_branch="$(git branch --show-current)"
remote_ref="refs/remotes/$remote/$branch"

if ! git show-ref --verify --quiet "$remote_ref"; then
  echo "Remote branch not found: $remote/$branch" >&2
  exit 1
fi

if [[ "$current_branch" == "$branch" ]]; then
  echo "[repo-sync] fast-forwarding checked out branch $branch"
  git pull --ff-only "$remote" "$branch"
else
  remote_sha="$(git rev-parse "$remote_ref")"
  echo "[repo-sync] updating local ref $branch -> $remote_sha while staying on $current_branch"
  git update-ref "refs/heads/$branch" "$remote_sha"
fi

echo "[repo-sync] done"
