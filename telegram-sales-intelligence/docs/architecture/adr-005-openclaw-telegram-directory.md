# ADR-005: Sanitized OpenClaw Telegram Directory

## Status

Accepted

## Context

The customer-management drawer must show real Telegram identities already known to OpenClaw. OpenClaw uses Telegram bot accounts, while the existing collector uses Telegram user sessions. Bot API accounts cannot enumerate a personal account's complete dialog history, and their tokens must not be exposed to the web or application database.

## Decision

A host-level timer reads the local OpenClaw configuration, verifies configured numeric `allowFrom` entries with Telegram `getChat`, and writes a sanitized directory containing only bot identity and verified private-chat identity fields.

The API mounts this directory read-only. It combines these OpenClaw sources with collector sessions that have a stored Telegram user session. Seed sessions without encrypted session material are not offered as real sources.

Tracking an OpenClaw chat upserts a Customer identity but does not create synthetic messages or conversations. Message history remains the responsibility of a real Telegram user-session collector or a future event-ingestion integration.

## Consequences

- Bot tokens and the full OpenClaw config stay outside application containers and API responses.
- The drawer accurately represents private chats explicitly known to configured bots.
- A Bot API source does not claim access to historical personal dialogs.
- The directory may be up to one timer interval stale and becomes empty if no verified source is available.
