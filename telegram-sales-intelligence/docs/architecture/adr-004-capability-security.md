# ADR-004: Capability-based AI and integration security

## Status

Accepted

## Context

Personal Telegram sessions are highly sensitive. AI may advise a sale but must never impersonate the sale, close a conversation, or mark a deal won.

## Decision

Only the collector receives Telegram API credentials and decrypted StringSession state. MCP receives only Core API URL and an internal token. Its tools are an explicit per-agent allowlist and contain no customer-send, SQL, session-read, or automatic-close capability. Conversation outcome changes exist only on the authenticated manual-close API with RBAC and audit.

## Trade-offs

- Positive: structural least privilege instead of prompt-only safety.
- Negative: OpenClaw cannot perform direct customer automation.
- Mitigation: private Suggestion Bot gives the sale actionable text while preserving human control.
- Revisit only through a new security review and explicit product decision.
