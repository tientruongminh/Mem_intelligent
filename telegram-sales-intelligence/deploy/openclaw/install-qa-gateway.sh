#!/usr/bin/env bash
set -euo pipefail

MAIN_CONFIG="${OPENCLAW_CONFIG_PATH:-/root/.openclaw/openclaw.json}"
QA_CONFIG="${OPENCLAW_QA_CONFIG_PATH:-/root/.openclaw/openclaw-qa.json}"
QA_WORKSPACE="${OPENCLAW_QA_WORKSPACE:-/root/.openclaw/sales-agents/nhuit-qa-sales-chat}"
SOURCE_ACCOUNT_ID="${OPENCLAW_QA_SOURCE_ACCOUNT_ID:-friend8718620168}"
SOURCE_AGENT_ID="${OPENCLAW_QA_SOURCE_AGENT_ID:-friend8718620168-sales-chat}"
QA_ACCOUNT_ID="${OPENCLAW_QA_ACCOUNT_ID:-nhuit-qa}"
QA_AGENT_ID="${OPENCLAW_QA_AGENT_ID:-nhuit-qa-sales-chat}"
QA_PORT="${OPENCLAW_QA_PORT:-18790}"
SERVICE_NAME="${OPENCLAW_QA_SERVICE_NAME:-openclaw-qa-gateway.service}"
OPENCLAW_BIN="${OPENCLAW_COMMAND:-/root/.openclaw-cli/bin/openclaw}"

for command in jq openssl systemctl; do
  command -v "$command" >/dev/null || {
    echo "$command is required" >&2
    exit 1
  }
done

[[ -x "$OPENCLAW_BIN" ]] || {
  echo "OpenClaw executable not found: $OPENCLAW_BIN" >&2
  exit 1
}

jq -e --arg id "$SOURCE_ACCOUNT_ID" '.channels.telegram.accounts[$id]' "$MAIN_CONFIG" >/dev/null
jq -e --arg id "$SOURCE_AGENT_ID" '.agents.list[] | select(.id == $id)' "$MAIN_CONFIG" >/dev/null

mkdir -p "$(dirname "$QA_CONFIG")" "$QA_WORKSPACE"

cat >"$QA_WORKSPACE/AGENTS.md" <<'EOF'
# Sales QA Assistant

You are the private Vietnamese sales QA assistant. Answer questions from the sales employee; do not generate unsolicited reply suggestions and never contact a customer.
Use only real sales data. Prefer exec bridge calls in the exact form: /usr/local/bin/tsi-sales-data TOOL 'JSON_ARGUMENTS'. Never add pipes, redirects, or shell operators.
For questions about why a reply was suggested, resolve the customer and conversation, then inspect get_reply_suggestion, get_suggestion_basis, get_conversation_context, get_workflow_graph, workflow evidence, relevant insights, and employee experience.
State the customer name and conversationId. Separate direct evidence from inference and identify the workflow stage, customer message, experience, or insight that affected the recommendation.
If a tool fails, retry the same documented tool through the exec bridge. Never present a failed lookup as evidence. Do not invent IDs, metrics, appointments, evidence, or tool results.
EOF

gateway_token="$(jq -r '.gateway.auth.token // empty' "$QA_CONFIG" 2>/dev/null || true)"
[[ -n "$gateway_token" ]] || gateway_token="$(openssl rand -hex 24)"

temporary_config="$(mktemp "${QA_CONFIG}.XXXXXX")"
trap 'rm -f -- "${temporary_config:-}" "${temporary_unit:-}"' EXIT

jq \
  --arg sourceAccount "$SOURCE_ACCOUNT_ID" \
  --arg sourceAgent "$SOURCE_AGENT_ID" \
  --arg qaAccount "$QA_ACCOUNT_ID" \
  --arg qaAgent "$QA_AGENT_ID" \
  --arg qaWorkspace "$QA_WORKSPACE" \
  --arg gatewayToken "$gateway_token" \
  --argjson port "$QA_PORT" \
  '
    .gateway.port = $port
    | .gateway.bind = "loopback"
    | .gateway.auth = {mode: "token", token: $gatewayToken}
    | .gateway.reload.mode = "hot"
    | .channels.telegram.defaultAccount = $qaAccount
    | .channels.telegram.accounts = {
        ($qaAccount): (.channels.telegram.accounts[$sourceAccount] | .enabled = true)
      }
    | .agents.list = [
        (.agents.list[] | select(.id == $sourceAgent)
          | .id = $qaAgent
          | .name = "Sales QA Assistant"
          | .workspace = $qaWorkspace
          | .identity = {name: "Sales QA Assistant"}
          | del(.subagents))
      ]
    | .bindings = [{agentId: $qaAgent, match: {channel: "telegram", accountId: $qaAccount}}]
  ' "$MAIN_CONFIG" >"$temporary_config"

chmod 0600 "$temporary_config"
mv -f -- "$temporary_config" "$QA_CONFIG"

unit_path="/etc/systemd/system/$SERVICE_NAME"
temporary_unit="$(mktemp "${unit_path}.XXXXXX")"
cat >"$temporary_unit" <<EOF
[Unit]
Description=OpenClaw Telegram Sales QA Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment=HOME=/root
Environment=OPENCLAW_CONFIG_PATH=$QA_CONFIG
ExecStart=$OPENCLAW_BIN gateway run --port $QA_PORT --bind loopback
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
chmod 0644 "$temporary_unit"
mv -f -- "$temporary_unit" "$unit_path"

systemctl daemon-reload
if ! systemctl enable "$SERVICE_NAME" >/dev/null 2>&1; then
  wants_dir=/etc/systemd/system/multi-user.target.wants
  mkdir -p "$wants_dir"
  ln -sfn "$unit_path" "$wants_dir/$SERVICE_NAME"
fi
if ! systemctl is-active --quiet "$SERVICE_NAME"; then
  systemctl start "$SERVICE_NAME"
fi

echo "QA gateway configured: $SERVICE_NAME on 127.0.0.1:$QA_PORT"
