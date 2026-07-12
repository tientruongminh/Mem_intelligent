#!/usr/bin/env bash
set -euo pipefail

SOURCE_SCRIPT="${OPENCLAW_DIRECTORY_SYNC_SOURCE:-$(cd "$(dirname "$0")" && pwd)/sync-telegram-directory.sh}"
INSTALL_SCRIPT="${OPENCLAW_DIRECTORY_SYNC_SCRIPT:-/usr/local/sbin/tsi-sync-openclaw-telegram-directory}"
SERVICE_NAME="${OPENCLAW_DIRECTORY_SYNC_SERVICE:-tsi-openclaw-telegram-directory.service}"
TIMER_NAME="${OPENCLAW_DIRECTORY_SYNC_TIMER:-tsi-openclaw-telegram-directory.timer}"

command -v systemctl >/dev/null || {
  echo "systemctl is required" >&2
  exit 1
}
[[ -f "$SOURCE_SCRIPT" ]] || {
  echo "Sync script not found: $SOURCE_SCRIPT" >&2
  exit 1
}

install -m 0750 "$SOURCE_SCRIPT" "$INSTALL_SCRIPT"

service_path="/etc/systemd/system/$SERVICE_NAME"
cat >"$service_path" <<EOF
[Unit]
Description=Build a sanitized Telegram chat directory from OpenClaw
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$INSTALL_SCRIPT
User=root
Group=root
EOF

timer_path="/etc/systemd/system/$TIMER_NAME"
cat >"$timer_path" <<EOF
[Unit]
Description=Refresh the sanitized OpenClaw Telegram chat directory

[Timer]
OnBootSec=20s
OnUnitActiveSec=60s
AccuracySec=5s
Unit=$SERVICE_NAME
Persistent=true

[Install]
WantedBy=timers.target
EOF

chmod 0644 "$service_path" "$timer_path"
systemctl daemon-reload
systemctl start "$SERVICE_NAME"
systemctl enable --now "$TIMER_NAME"
echo "OpenClaw Telegram directory sync installed: $TIMER_NAME"
