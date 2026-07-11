# ADR-002: N-Layer core and tenant-scoped repositories

## Status

Accepted

## Context

Conversation resolution, manual outcomes, workflow validation, and suggestion triggers are business rules that need unit tests without PostgreSQL. Controllers and AI adapters must not bypass tenant isolation.

## Decision

Domain is dependency-free TypeScript. Application use cases depend on domain repository interfaces and application ports. Prisma, MinIO, BullMQ, AI, JWT, encryption, and HTTP adapters live in Infrastructure. Express controllers only parse, invoke, and map responses. Every repository/query receives an organization-scoped `ActorContext`.

## Trade-offs

- Positive: business rules are fast to test and infrastructure can be replaced.
- Negative: more interfaces and mapping than direct Prisma calls.
- Mitigation: interfaces are grouped by real capabilities; no generic abstraction is added without a use case.
- Revisit if the domain becomes simple CRUD or package boundaries create disproportionate maintenance cost.
