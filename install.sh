#!/usr/bin/env bash
set -euo pipefail

CODEX_ROOT="${CODEX_HOME:-${HOME}/.codex}"
SKILLS_DIR="${CODEX_ROOT}/skills"
DEST="${SKILLS_DIR}/xiaofang"
BASE_URL="https://github.com/mestomesto676-prog/xiaofang-skill/raw/main/backups/xiaofang-unified-v1.0-source.tar.gz"

if [[ -e "$DEST" ]]; then
  printf '已有 %s，出于安全考虑不覆盖。请先备份或使用 restore.sh。\n' "$DEST" >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
mkdir -p "$SKILLS_DIR"

archive="$tmp_dir/xiaofang.tar.gz"
if command -v curl >/dev/null 2>&1; then
  curl -fL --retry 3 "$BASE_URL" -o "$archive"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$archive" "$BASE_URL"
else
  printf '需要 curl 或 wget。\n' >&2
  exit 1
fi

tar -xzf "$archive" -C "$SKILLS_DIR"

if [[ -x "$DEST/scripts/xf.sh" ]]; then
  "$DEST/scripts/xf.sh" setup
fi

printf '\n小方 Skill 已安装到：%s\n' "$DEST"
printf '请新开一个 Codex 任务，让 Skill 列表重新载入。\n'
