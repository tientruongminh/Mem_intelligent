#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-/root/.openclaw/openclaw.json}"
MCP_URL="${SALES_MCP_URL:-http://127.0.0.1:4200/mcp}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:?INTERNAL_SERVICE_TOKEN is required}"
ORG_ID="${SALES_ORGANIZATION_ID:-10000000-0000-4000-8000-000000000001}"
ADMIN_ID="${SALES_ADMIN_EMPLOYEE_ID:-10000000-0000-4000-8000-000000000004}"
SALE_ID="${SALES_EMPLOYEE_ID:-10000000-0000-4000-8000-000000000005}"
MODEL="${SALES_AGENT_MODEL:-mimo/mimo-v2.5-pro}"
WORKSPACE_ROOT="${SALES_WORKSPACE_ROOT:-/root/.openclaw/sales-agents}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="${CONFIG_PATH}.sales-backup.${timestamp}"
cp -a -- "$CONFIG_PATH" "$backup_path"

mapfile -t accounts < <(jq -r '.channels.telegram.accounts | keys[]' "$CONFIG_PATH")
if (( ${#accounts[@]} == 0 )); then
  echo "No Telegram accounts found in $CONFIG_PATH" >&2
  exit 1
fi

mkdir -p -- "$WORKSPACE_ROOT"
sales_agents='[]'
sales_bindings='[]'
agent_ids='[]'

for account in "${accounts[@]}"; do
  chat_id="${account}-sales-chat"
  suggestion_id="${account}-sales-suggestion"
  chat_workspace="${WORKSPACE_ROOT}/${chat_id}"
  suggestion_workspace="${WORKSPACE_ROOT}/${suggestion_id}"

  mkdir -p -- "$chat_workspace" "$suggestion_workspace"

  printf '%s\n' \
    '# Sales Chat Assistant' \
    '' \
    "You are the private Vietnamese sales copilot for Telegram account: ${account}." \
    'Always reply in Vietnamese unless the employee asks for another language.' \
    'You assist the sales employee; never pretend to be the customer and never send a customer message automatically.' \
    'Use sales_data MCP tools for customer profiles, conversations, workflow evidence, insights, employee metrics, and reports.' \
    "For reply suggestions, delegate to agent ${suggestion_id} with sessions_spawn and wait for its result." \
    'Return one concise suggested reply plus a short rationale and confidence. Make clear that the employee decides whether to send it.' \
    'Detect concrete appointment details in the conversation. Ask the employee to confirm before creating a calendar draft.' \
    'Only call create_calendar_draft after explicit confirmation. A draft is not a saved calendar event.' \
    'For daily reports, combine real MCP metrics, conversations, insights, risks, next actions, and source references.' \
    'Do not invent IDs, metrics, evidence, appointments, or tool results. Ask for the customer or conversation when ambiguous.' \
    > "${chat_workspace}/AGENTS.md"

  printf '%s\n' \
    '# Reply Suggestion Specialist' \
    '' \
    "You are the private reply-suggestion specialist for Telegram account: ${account}." \
    'Always reply in Vietnamese unless the parent agent asks otherwise.' \
    'Use sales_suggestion MCP tools to load bounded conversation context, workflow evidence, experience, and relevant insights.' \
    'Compose a natural, specific, non-pushy answer that advances the current sales stage.' \
    'When a conversationId is provided, save the suggestion with evidence message IDs before returning it.' \
    'Return the suggestion text, short rationale, confidence, and saved suggestion ID when available.' \
    'Never contact the customer, never mark a deal closed, and never create a calendar item.' \
    'Do not invent facts or evidence. State what is missing when context is insufficient.' \
    > "${suggestion_workspace}/AGENTS.md"

  chat_agent="$(jq -nc \
    --arg id "$chat_id" \
    --arg account "$account" \
    --arg workspace "$chat_workspace" \
    --arg model "$MODEL" \
    --arg suggestion "$suggestion_id" \
    '{
      id: $id,
      name: ("Sales Chat - " + $account),
      workspace: $workspace,
      model: {primary: $model, fallbacks: []},
      identity: {name: ("Sales Chat " + $account)},
      tools: {
        profile: "messaging",
        alsoAllow: ["sessions_spawn", "agents_list", "session_status", "sales_data__*"],
        deny: ["exec", "process", "write", "edit", "apply_patch", "browser", "gateway"]
      },
      subagents: {allowAgents: [$suggestion], requireAgentId: true}
    }')"

  suggestion_agent="$(jq -nc \
    --arg id "$suggestion_id" \
    --arg account "$account" \
    --arg workspace "$suggestion_workspace" \
    --arg model "$MODEL" \
    '{
      id: $id,
      name: ("Sales Suggestion - " + $account),
      workspace: $workspace,
      model: {primary: $model, fallbacks: []},
      identity: {name: ("Sales Suggestion " + $account)},
      tools: {
        profile: "messaging",
        alsoAllow: ["sales_suggestion__*"],
        deny: ["message", "exec", "process", "write", "edit", "apply_patch", "browser", "gateway", "cron"]
      }
    }')"

  sales_agents="$(jq -c --argjson chat "$chat_agent" --argjson suggestion "$suggestion_agent" \
    '. + [$chat, $suggestion]' <<<"$sales_agents")"
  sales_bindings="$(jq -c --arg agent "$chat_id" --arg account "$account" \
    '. + [{agentId: $agent, match: {channel: "telegram", accountId: $account}}]' <<<"$sales_bindings")"
  agent_ids="$(jq -c --arg chat "$chat_id" --arg suggestion "$suggestion_id" \
    '. + [$chat, $suggestion]' <<<"$agent_ids")"
done

temp_path="$(mktemp "${CONFIG_PATH}.sales.XXXXXX")"
trap 'rm -f -- "$temp_path"' EXIT

jq \
  --argjson salesAgents "$sales_agents" \
  --argjson salesBindings "$sales_bindings" \
  --argjson salesAgentIds "$agent_ids" \
  --arg mcpUrl "$MCP_URL" \
  --arg token "$INTERNAL_TOKEN" \
  --arg orgId "$ORG_ID" \
  --arg adminId "$ADMIN_ID" \
  --arg saleId "$SALE_ID" \
  '
    .gateway.reload.mode = "hot"
    | .agents.list = ([.agents.list[] | select(.id as $id | $salesAgentIds | index($id) | not)] + $salesAgents)
    | .bindings = ([.bindings[] | select(.match.channel != "telegram" or (.match.accountId as $id | ($salesBindings | map(.match.accountId) | index($id) | not)))] + $salesBindings)
    | .mcp.servers.sales_data = {
        url: $mcpUrl,
        transport: "streamable-http",
        connectTimeout: 10,
        timeout: 60,
        supportsParallelToolCalls: true,
        headers: {
          "x-internal-token": $token,
          "x-organization-id": $orgId,
          "x-employee-id": $adminId,
          "x-employee-role": "ADMIN",
          "x-agent-type": "ANALYST"
        }
      }
    | .mcp.servers.sales_suggestion = {
        url: $mcpUrl,
        transport: "streamable-http",
        connectTimeout: 10,
        timeout: 60,
        supportsParallelToolCalls: false,
        headers: {
          "x-internal-token": $token,
          "x-organization-id": $orgId,
          "x-employee-id": $saleId,
          "x-employee-role": "SALE",
          "x-agent-type": "SUGGESTION"
        }
      }
  ' "$CONFIG_PATH" > "$temp_path"

jq -e . "$temp_path" >/dev/null
OPENCLAW_CONFIG_PATH="$temp_path" openclaw config validate >/dev/null
chmod --reference="$CONFIG_PATH" "$temp_path"
mv -f -- "$temp_path" "$CONFIG_PATH"
trap - EXIT

printf 'Configured %d Telegram accounts, %d sales agents, and 2 MCP servers.\n' \
  "${#accounts[@]}" "$(( ${#accounts[@]} * 2 ))"
printf 'Backup: %s\n' "$backup_path"
