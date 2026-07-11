#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${TSI_PROJECT_DIR:-/opt/mem-intelligent-sales/telegram-sales-intelligence}"
REDIS_CONTAINER="${TSI_REDIS_CONTAINER:-tsi_sales_vps-redis-1}"
DOCKER_NETWORK="${TSI_DOCKER_NETWORK:-tsi_sales_vps_tsi}"
SUGGESTION_AGENT_ID="${OPENCLAW_SUGGESTION_AGENT_ID:?OPENCLAW_SUGGESTION_AGENT_ID is required}"
TELEGRAM_ACCOUNT_ID="${OPENCLAW_TELEGRAM_ACCOUNT_ID:?OPENCLAW_TELEGRAM_ACCOUNT_ID is required}"
TELEGRAM_TARGET_ID="${OPENCLAW_TELEGRAM_TARGET_ID:?OPENCLAW_TELEGRAM_TARGET_ID is required}"
OPENCLAW_COMMAND_PATH="${OPENCLAW_COMMAND_PATH:-$(command -v openclaw)}"
COREPACK_COMMAND_PATH="${COREPACK_COMMAND_PATH:-$(command -v corepack)}"
ENV_PATH="/etc/tsi-openclaw-suggestion-dispatcher.env"
RUNNER_PATH="/usr/local/bin/tsi-openclaw-suggestion-dispatcher"
UNIT_PATH="/etc/systemd/system/tsi-openclaw-suggestion-dispatcher.service"

[[ -x "$OPENCLAW_COMMAND_PATH" ]] || { echo "OpenClaw command is not executable" >&2; exit 1; }
[[ -x "$COREPACK_COMMAND_PATH" ]] || { echo "Corepack command is not executable" >&2; exit 1; }

printf '%s\n' \
  "TSI_PROJECT_DIR=${PROJECT_DIR}" \
  "TSI_REDIS_CONTAINER=${REDIS_CONTAINER}" \
  "TSI_DOCKER_NETWORK=${DOCKER_NETWORK}" \
  "OPENCLAW_SUGGESTION_AGENT_ID=${SUGGESTION_AGENT_ID}" \
  "OPENCLAW_TELEGRAM_ACCOUNT_ID=${TELEGRAM_ACCOUNT_ID}" \
  "OPENCLAW_TELEGRAM_TARGET_ID=${TELEGRAM_TARGET_ID}" \
  "OPENCLAW_COMMAND=${OPENCLAW_COMMAND_PATH}" \
  "COREPACK_COMMAND=${COREPACK_COMMAND_PATH}" \
  'SUGGESTION_POLL_INTERVAL_MS=10000' \
  'SUGGESTION_DISPATCHER_STATE_PATH=/var/lib/tsi-openclaw-suggestion-dispatcher/delivered.json' \
  > "$ENV_PATH"
chmod 0600 "$ENV_PATH"

runner_temp="$(mktemp)"
printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'source /etc/tsi-openclaw-suggestion-dispatcher.env' \
  'redis_ip="$(docker inspect -f "{{with index .NetworkSettings.Networks \"${TSI_DOCKER_NETWORK}\"}}{{.IPAddress}}{{end}}" "$TSI_REDIS_CONTAINER")"' \
  '[[ -n "$redis_ip" ]] || { echo "Cannot resolve Redis container IP" >&2; exit 1; }' \
  'export REDIS_URL="redis://${redis_ip}:6379"' \
  'export PATH="$(dirname "$COREPACK_COMMAND"):$(dirname "$OPENCLAW_COMMAND"):$PATH"' \
  'cd "$TSI_PROJECT_DIR"' \
  'exec "$COREPACK_COMMAND" pnpm --filter @tsi/worker start:suggestion-dispatcher' \
  > "$runner_temp"
install -m 0750 -o root -g root "$runner_temp" "$RUNNER_PATH"
rm -f "$runner_temp"

unit_temp="$(mktemp)"
printf '%s\n' \
  '[Unit]' \
  'Description=Telegram Sales OpenClaw Suggestion Dispatcher' \
  'After=docker.service network-online.target' \
  'Wants=network-online.target' \
  '' \
  '[Service]' \
  'Type=simple' \
  'User=root' \
  "ExecStart=${RUNNER_PATH}" \
  'Restart=always' \
  'RestartSec=5' \
  'NoNewPrivileges=true' \
  'PrivateTmp=true' \
  '' \
  '[Install]' \
  'WantedBy=multi-user.target' \
  > "$unit_temp"
install -m 0644 -o root -g root "$unit_temp" "$UNIT_PATH"
rm -f "$unit_temp"

mkdir -p /var/lib/tsi-openclaw-suggestion-dispatcher
chmod 0700 /var/lib/tsi-openclaw-suggestion-dispatcher
systemctl daemon-reload
systemctl enable --now tsi-openclaw-suggestion-dispatcher.service
systemctl is-active --quiet tsi-openclaw-suggestion-dispatcher.service
printf 'Suggestion dispatcher is active for agent %s via Telegram account %s.\n' \
  "$SUGGESTION_AGENT_ID" "$TELEGRAM_ACCOUNT_ID"
