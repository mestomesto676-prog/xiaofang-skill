#!/bin/zsh
set -euo pipefail

key=$(/usr/bin/osascript <<'APPLESCRIPT'
set dialogResult to display dialog "粘贴新的 MiniMax API Key。它只会保存到 macOS 钥匙串，不会写入项目。" default answer "" with hidden answer buttons {"取消", "安全保存"} default button "安全保存" with title "生活大于考研｜旁白密钥"
return text returned of dialogResult
APPLESCRIPT
)

if [[ -z "$key" ]]; then
  echo "未保存：密钥为空。" >&2
  exit 1
fi

/usr/bin/security add-generic-password \
  -U \
  -a "codex-remotion" \
  -s "minimax-api-key" \
  -w "$key" >/dev/null

unset key
echo "MiniMax API Key 已安全保存到 macOS 钥匙串。"
