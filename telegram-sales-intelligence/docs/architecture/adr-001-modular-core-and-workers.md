# ADR-001: Modular core with asynchronous edge processes

## Status

Accepted

## Context

The MVP has rich conversation rules, Telegram ingestion, delayed AI analysis, reports, and MCP access. It is expected to serve a small demo organization first; independent teams and proven service-level scaling needs do not exist yet.

## Decision

Keep business rules in one N-Layer core split into workspace packages. Run API, worker, Telegram collector, MCP server, and web as separate processes, backed by one PostgreSQL database. Redis/BullMQ carries delayed work and the outbox decouples ingestion from follow-up processing.

## Trade-offs

- Positive: one transactional model, low operational cost, clear capability boundaries, and easy local startup.
- Negative: API and worker share deployment-time code and the database is a central dependency.
- Mitigation: package boundaries are explicit; collector and MCP never access PostgreSQL directly.
- Revisit when one workload needs independent scaling, team ownership splits, or availability objectives diverge.
