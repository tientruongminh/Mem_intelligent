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
    local account_id token bot_response bot_id bot_username display_name role
    account_id="$(jq -r '.openclawAccountId' <<<"$candidate")"
    token="$(jq -r '.token' <<<"$candidate")"
    bot_response="$(telegram_call "$token" getMe)"
    [[ "$(jq -r '.ok // false' <<<"$bot_response")" == "true" ]] || continue

    bot_id="$(jq -r '.result.id | tostring' <<<"$bot_response")"
    bot_username="$(jq -r '.result.username // ""' <<<"$bot_response")"
    display_name="$(jq -r '[.result.first_name, .result.last_name] | map(select(. != null and . != "")) | join(" ")' <<<"$bot_response")"
    [[ -n "$display_name" ]] || display_name="${bot_username:-OpenClaw Telegram bot}"
    role="UNKNOWN"
    if [[ "${account_id,,} ${bot_username,,} ${display_name,,}" =~ (suggest|reply) ]]; then
      role="SUGGESTION"
    elif [[ "${account_id,,} ${bot_username,,} ${display_name,,}" =~ (qa|analyst|analysis) ]]; then
      role="QA"
    elif [[ "${account_id,,} ${bot_username,,} ${display_name,,}" =~ (chat|assistant) ]]; then
      role="CHAT"
    fi

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
        --arg saleTelegramUserId "$telegram_user_id" \
        --arg saleName "$name" \
        --arg saleUsername "$username" \
        --arg openclawAccountId "$account_id" \
        --arg telegramBotId "$bot_id" \
        --arg botUsername "$bot_username" \
        --arg displayName "$display_name" \
        --arg role "$role" \
        '{
          saleTelegramUserId:$saleTelegramUserId,
          saleName:$saleName,
          saleUsername:$saleUsername,
          assistantBot:{
            openclawAccountId:$openclawAccountId,
            telegramBotId:$telegramBotId,
            botUsername:$botUsername,
            displayName:$displayName,
            role:$role
          }
        }' \
        >>"$candidates"
    done < <(jq -r '.allowFrom[]? | tostring' <<<"$candidate")
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
    group_by(.saleTelegramUserId)
    | map({
        accountId: ("openclaw-sale-" + .[0].saleTelegramUserId),
        saleTelegramUserId: .[0].saleTelegramUserId,
        saleName: .[0].saleName,
        saleUsername: .[0].saleUsername,
        status: "BOUND_TO_ASSISTANTS",
        source: "OPENCLAW_SALE_BINDING",
        assistantBots: (map(.assistantBot) | unique_by(.openclawAccountId + ":" + (.telegramBotId // "")) | sort_by(.role, .displayName)),
        openclawAccountIds: (map(.assistantBot.openclawAccountId) | unique)
      })
    | sort_by(.saleName)
    | {generatedAt:$generatedAt,accounts:.}
  ' "$candidates" >"$temporary_output"

chmod 0644 "$temporary_output"
mv -f -- "$temporary_output" "$OUTPUT_PATH"
echo "OpenClaw Telegram sale directory updated: $(jq '.accounts | length' "$OUTPUT_PATH") sale accounts"
