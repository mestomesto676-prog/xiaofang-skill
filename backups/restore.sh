#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEX_ROOT="${CODEX_HOME:-${HOME}/.codex}"
SKILLS_DIR="${CODEX_ROOT}/skills"
STAMP="$(date +%Y%m%d-%H%M%S)"
ROLLBACK_DIR="${CODEX_ROOT}/skill-backups/restore-${STAMP}"

usage() {
  printf 'Usage: %s unified|pre-merge\n' "$0"
}

if [[ "$MODE" != "unified" && "$MODE" != "pre-merge" ]]; then
  usage
  exit 2
fi

cd "$BUNDLE_DIR"
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 -c MANIFEST.sha256
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum -c MANIFEST.sha256
else
  printf 'Cannot verify backup: shasum or sha256sum is required.\n' >&2
  exit 1
fi

mkdir -p "$SKILLS_DIR" "$ROLLBACK_DIR"

for skill_name in xiaofang xiaofang-video remotion-explainer-video; do
  skill_path="${SKILLS_DIR}/${skill_name}"
  if [[ -e "$skill_path" ]]; then
    mv "$skill_path" "$ROLLBACK_DIR/"
  fi
done

if [[ "$MODE" == "unified" ]]; then
  tar -xzf "$BUNDLE_DIR/xiaofang-unified-v1.0-source.tar.gz" -C "$SKILLS_DIR"
  printf '\nRestored unified xiaofang skill.\n'
  printf 'Previous active skill folders, if any, were moved to: %s\n' "$ROLLBACK_DIR"
  printf 'Rebuild local runtime with: %s/xiaofang/scripts/xf.sh setup\n' "$SKILLS_DIR"
else
  tar -xzf "$BUNDLE_DIR/xiaofang-pre-merge-source.tar.gz" -C "$SKILLS_DIR"
  printf '\nRestored the two pre-merge skills.\n'
  printf 'Previous active skill folders, if any, were moved to: %s\n' "$ROLLBACK_DIR"
  printf 'Rebuild local runtime with: %s/xiaofang-video/scripts/xf.sh setup\n' "$SKILLS_DIR"
fi

printf 'Start a new Codex task after restoration so the skill list refreshes.\n'
