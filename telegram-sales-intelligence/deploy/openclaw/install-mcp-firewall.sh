#!/usr/bin/env bash
set -euo pipefail

install -d -m 0755 /usr/local/sbin
printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'iptables -C DOCKER-USER -p tcp --dport 4200 ! -s 127.0.0.1/32 -j DROP 2>/dev/null || iptables -I DOCKER-USER 1 -p tcp --dport 4200 ! -s 127.0.0.1/32 -j DROP' \
  'ip6tables -C DOCKER-USER -p tcp --dport 4200 ! -s ::1/128 -j DROP 2>/dev/null || ip6tables -I DOCKER-USER 1 -p tcp --dport 4200 ! -s ::1/128 -j DROP' \
  | install -m 0755 -o root -g root /dev/stdin /usr/local/sbin/tsi-mcp-firewall

printf '%s\n' \
  '[Unit]' \
  'Description=Restrict Telegram Sales Intelligence MCP to localhost' \
  'After=docker.service' \
  'Wants=docker.service' \
  '' \
  '[Service]' \
  'Type=oneshot' \
  'ExecStart=/usr/local/sbin/tsi-mcp-firewall' \
  'RemainAfterExit=yes' \
  '' \
  '[Install]' \
  'WantedBy=multi-user.target' \
  | install -m 0644 -o root -g root /dev/stdin /etc/systemd/system/tsi-mcp-firewall.service

systemctl daemon-reload
systemctl enable --now tsi-mcp-firewall.service
