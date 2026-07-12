#!/usr/bin/env bash
set -euo pipefail

OUTPUT_PATH="${OPENCLAW_DIRECTORY_OUTPUT:-/var/lib/tsi-openclaw-directory/directory.json}"
QA_CONFIG="${OPENCLAW_QA_CONFIG_PATH:-/root/.openclaw/openclaw-qa.json}"
MAIN_CONFIG="${OPENCLAW_CONFIG_PATH:-/root/.openclaw/openclaw.json}"

for command in curl jq; do
  command -v "$command" >/dev/null || {
    echo "$command is required" >&2
    exit 1
  }
done

mkdir -p "$(dirname "$OUTPUT_PATH")"
work_dir="$(mktemp -d)"
trap 'rm -rf -- "$work_dir"' EXIT
candidates="$work_dir/accounts.jsonl"
: >"$candidates"

telegram_call() {
  local token="$1"
  local method="$2"
  local query="${3:-}"
  local curl_config="$work_dir/curl-$RANDOM.conf"
  printf 'silent\nshow-error\nmax-time = 15\nurl = "https://api.telegram.org/bot%s/%s%s"\n' \
    "$token" "$method" "$query" >"$curl_config"
  chmod 0600 "$curl_config"
  curl --config "$curl_config" 2>/dev/null || printf '{"ok":false}'
  rm -f -- "$curl_config"
}

process_config() {
  local config="$1"
  [[ -f "$config" ]] || return 0

  while IFS= read -r candidate; do
    local account_id token bot_response bot_id bot_username display_name chats_file
    account_id="$(jq -r '.openclawAccountId' <<<"$candidate")"
    token="$(jq -r '.token' <<<"$candidate")"
    bot_response="$(telegram_call "$token" getMe)"
    [[ "$(jq -r '.ok // false' <<<"$bot_response")" == "true" ]] || continue

    bot_id="$(jq -r '.result.id | tostring' <<<"$bot_response")"
    bot_username="$(jq -r '.result.username // ""' <<<"$bot_response")"
    display_name="$(jq -r '[.result.first_name, .result.last_name] | map(select(. != null and . != "")) | join(" ")' <<<"$bot_response")"
    [[ -n "$display_name" ]] || display_name="${bot_username:-OpenClaw Telegram bot}"
    chats_file="$work_dir/chats-$RANDOM.jsonl"
    : >"$chats_file"

    while IFS= read -r telegram_user_id; do
      [[ "$telegram_user_id" =~ ^[0-9]+$ ]] || continue
      local encoded chat_response chat_type name username
      encoded="$(jq -rn --arg value "$telegram_user_id" '$value | @uri')"
      chat_response="$(telegram_call "$token" getChat "?chat_id=$encoded")"
      [[ "$(jq -r '.ok // false' <<<"$chat_response")" == "true" ]] || continue
      chat_type="$(jq -r '.result.type // ""' <<<"$chat_response")"
      [[ "$chat_type" == "private" ]] || continue
      name="$(jq -r '[.result.first_name, .result.last_name] | map(select(. != null and . != "")) | join(" ")' <<<"$chat_response")"
      username="$(jq -r '.result.username // ""' <<<"$chat_response")"
      [[ -n "$name" ]] || name="${username:-Telegram $telegram_user_id}"
      jq -nc \
        --arg telegramUserId "$telegram_user_id" \
        --arg name "$name" \
        --arg username "$username" \
        '{telegramUserId:$telegramUserId,name:$name,username:$username,type:"private",verified:true}' \
        >>"$chats_file"
    done < <(jq -r '.allowFrom[]? | tostring' <<<"$candidate")

    jq -nc \
      --arg openclawAccountId "$account_id" \
      --arg telegramBotId "$bot_id" \
      --arg botUsername "$bot_username" \
      --arg displayName "$display_name" \
      --slurpfile chats "$chats_file" \
      '{openclawAccountId:$openclawAccountId,telegramBotId:$telegramBotId,botUsername:$botUsername,displayName:$displayName,chats:$chats}' \
      >>"$candidates"
  done < <(
    jq -c '
      (.channels.telegram.accounts // {})
      | to_entries[]
      | select(.value.enabled != false)
      | {
          openclawAccountId: .key,
          token: (.value.botToken // .value.token // ""),
          allowFrom: (.value.allowFrom // [])
        }
      | select(.token != "")
    ' "$config"
  )
}

# QA is read first so its purpose-specific account label is preferred after deduplication.
process_config "$QA_CONFIG"
process_config "$MAIN_CONFIG"

generated_at="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
temporary_output="$work_dir/directory.json"
jq -s \
  --arg generatedAt "$generated_at" \
  '
    sort_by(.telegramBotId)
    | group_by(.telegramBotId)
    | map({
        accountId: ("openclaw-" + .[0].telegramBotId),
        openclawAccountIds: (map(.openclawAccountId) | unique),
        telegramBotId: .[0].telegramBotId,
        botUsername: .[0].botUsername,
        displayName: .[0].displayName,
        status: "CONNECTED",
        source: "OPENCLAW",
        chats: (map(.chats[]) | unique_by(.telegramUserId) | sort_by(.name))
      })
    | {generatedAt:$generatedAt,accounts:.}
  ' "$candidates" >"$temporary_output"

chmod 0644 "$temporary_output"
mv -f -- "$temporary_output" "$OUTPUT_PATH"
echo "OpenClaw Telegram directory updated: $(jq '.accounts | length' "$OUTPUT_PATH") accounts"
