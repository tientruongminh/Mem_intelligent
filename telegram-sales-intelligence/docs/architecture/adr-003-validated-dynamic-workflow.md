# ADR-003: Validated dynamic workflow operations

## Status

Accepted

## Context

Workflow stages cannot be fixed in code. AI output is probabilistic, but workflow evidence and manual deal outcomes must remain trustworthy.

## Decision

AI returns Zod-validated operations (`ADD_NODE`, `UPDATE_NODE`, `ADD_EDGE`, `UPDATE_EDGE`, `MERGE_NODES`, `NO_CHANGE`). The application validator confirms tenant/conversation evidence, graph ownership, node locks, duplicate titles, self-edge rules, and confidence thresholds before one database transaction increments the revision and writes analysis/change logs.

## Trade-offs

- Positive: dynamic graphs remain auditable and evidence-backed.
- Negative: rejected AI output can delay workflow updates.
- Mitigation: fake AI is deterministic; failed/rejected runs remain observable and jobs can retry.
- Revisit when semantic duplicate detection needs embeddings or reviewers need a dedicated approval queue.
