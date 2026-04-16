# Schema Overview

<cite>
**Referenced Files in This Document**
- [agentid_build_plan.md](file://agentid_build_plan.md)
- [migrate.js](file://backend/src/models/migrate.js)
- [queries.js](file://backend/src/models/queries.js)
- [db.js](file://backend/src/models/db.js)
- [config/index.js](file://backend/src/config/index.js)
- [pkiChallenge.js](file://backend/src/services/pkiChallenge.js)
- [bagsReputation.js](file://backend/src/services/bagsReputation.js)
- [saidBinding.js](file://backend/src/services/saidBinding.js)
- [verify.js](file://backend/src/routes/verify.js)
- [agents.js](file://backend/src/routes/agents.js)
- [reputation.js](file://backend/src/routes/reputation.js)
- [register.js](file://backend/src/routes/register.js)
- [transform.js](file://backend/src/utils/transform.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document provides a comprehensive schema overview for the AgentID database design. It explains the overall architecture, table relationships, and design philosophy behind the three core tables: agent_identities (primary agent registry with reputation metrics), agent_verifications (challenge-response tracking), and agent_flags (community moderation system). It also documents the schema evolution from the build plan, detailing field definitions, data types, constraints, primary and foreign keys, and indexing strategy. Finally, it explains the rationale for the normalized design and how it supports AgentID’s trust verification workflows.

## Project Structure
The AgentID backend organizes database concerns under models, services, routes, and configuration. The schema is defined and migrated via a dedicated migration script and consumed by reusable query functions. Services encapsulate external integrations (Bags, SAID) and internal verification logic. Routes expose the API and orchestrate database operations.

```mermaid
graph TB
subgraph "Models"
M1["db.js<br/>PostgreSQL pool"]
M2["migrate.js<br/>Schema creation"]
M3["queries.js<br/>CRUD + discovery"]
end
subgraph "Services"
S1["pkiChallenge.js<br/>Challenge issuance + verification"]
S2["bagsReputation.js<br/>BAGS score computation"]
S3["saidBinding.js<br/>SAID registration + trust score"]
end
subgraph "Routes"
R1["verify.js<br/>PKI challenge endpoints"]
R2["agents.js<br/>Agent listing/detail/update"]
R3["reputation.js<br/>Reputation breakdown"]
R4["register.js<br/>Agent registration"]
end
subgraph "Config"
C1["config/index.js<br/>Environment variables"]
end
R1 --> S1
R2 --> S2
R4 --> S3
S1 --> M3
S2 --> M3
S3 --> M3
R1 --> M3
R2 --> M3
R3 --> M3
R4 --> M3
M3 --> M1
M2 --> M1
C1 --> M1
C1 --> S1
C1 --> S2
C1 --> S3
```

**Diagram sources**
- [db.js:1-45](file://backend/src/models/db.js#L1-L45)
- [migrate.js:1-100](file://backend/src/models/migrate.js#L1-L100)
- [queries.js:1-404](file://backend/src/models/queries.js#L1-L404)
- [pkiChallenge.js:1-102](file://backend/src/services/pkiChallenge.js#L1-L102)
- [bagsReputation.js:1-146](file://backend/src/services/bagsReputation.js#L1-L146)
- [saidBinding.js:1-119](file://backend/src/services/saidBinding.js#L1-L119)
- [verify.js:1-112](file://backend/src/routes/verify.js#L1-L112)
- [agents.js:1-251](file://backend/src/routes/agents.js#L1-L251)
- [reputation.js:1-44](file://backend/src/routes/reputation.js#L1-L44)
- [register.js:1-156](file://backend/src/routes/register.js#L1-L156)
- [config/index.js:1-31](file://backend/src/config/index.js#L1-L31)

**Section sources**
- [migrate.js:9-65](file://backend/src/models/migrate.js#L9-L65)
- [queries.js:11-109](file://backend/src/models/queries.js#L11-L109)
- [config/index.js:6-28](file://backend/src/config/index.js#L6-L28)

## Core Components
This section documents the three core tables and their roles in AgentID’s trust verification system.

- agent_identities
  - Purpose: Primary registry for agents, storing metadata, SAID linkage, and reputation metrics.
  - Key fields include pubkey (primary key), name, token_mint, bags_api_key_id, capability_set (JSONB), creator_x and creator_wallet, timestamps (registered_at, last_verified), status and flag_reason, and composite reputation metrics (bags_score, total_actions, successful_actions, failed_actions, plus ecosystem activity counts).
  - Constraints: Primary key on pubkey; default values for booleans and numeric fields; status constrained to a small set of values; JSONB for capability_set enables flexible capability discovery.

- agent_verifications
  - Purpose: Tracks challenge-response sessions for ongoing verification.
  - Key fields include id (primary key), pubkey (foreign key to agent_identities), nonce (unique), challenge (stored message), expires_at, completed flag, and created_at.
  - Constraints: Unique constraint on nonce; foreign key to agent_identities; completed flag ensures one-time use; expires_at enforces time-bound challenges.

- agent_flags
  - Purpose: Community moderation and flagging system.
  - Key fields include id (primary key), pubkey (foreign key to agent_identities), reporter_pubkey, reason, evidence (JSONB), created_at, and resolved flag.
  - Constraints: Foreign key to agent_identities; resolved flag supports administrative review; JSONB for evidence supports structured reporting.

**Section sources**
- [migrate.js:11-56](file://backend/src/models/migrate.js#L11-L56)
- [queries.js:17-29](file://backend/src/models/queries.js#L17-L29)
- [queries.js:213-222](file://backend/src/models/queries.js#L213-L222)
- [queries.js:267-279](file://backend/src/models/queries.js#L267-L279)

## Architecture Overview
The AgentID schema is designed around a normalized relational model with deliberate constraints and indexes to support:
- Identity management and metadata
- Ongoing PKI-based verification
- Community-driven moderation
- Efficient discovery and reputation computation

```mermaid
erDiagram
AGENT_IDENTITIES {
varchar pubkey PK
varchar name
text description
varchar token_mint
varchar bags_api_key_id
boolean said_registered
integer said_trust_score
jsonb capability_set
varchar creator_x
varchar creator_wallet
timestamptz registered_at
timestamptz last_verified
varchar status
text flag_reason
integer bags_score
integer total_actions
integer successful_actions
integer failed_actions
integer fee_claims_count
decimal fee_claims_sol
integer swaps_count
integer launches_count
}
AGENT_VERIFICATIONS {
serial id PK
varchar pubkey FK
varchar nonce UK
text challenge
timestamptz expires_at
boolean completed
timestamptz created_at
}
AGENT_FLAGS {
serial id PK
varchar pubkey FK
varchar reporter_pubkey
text reason
jsonb evidence
timestamptz created_at
boolean resolved
}
AGENT_IDENTITIES ||--o{ AGENT_VERIFICATIONS : "has challenges"
AGENT_IDENTITIES ||--o{ AGENT_FLAGS : "reported"
```

**Diagram sources**
- [migrate.js:11-56](file://backend/src/models/migrate.js#L11-L56)

## Detailed Component Analysis

### agent_identities: Primary Agent Registry
- Design philosophy: Centralized identity with embedded reputation metrics and capability declarations stored as JSONB for flexibility.
- Primary key: pubkey (VARCHAR, base58-like length).
- Notable constraints and defaults:
  - status defaults to a controlled set of values.
  - bags_score initialized to 0; counters initialized to 0.
  - capability_set stored as JSONB for efficient filtering and discovery.
- Representative usage:
  - Creation via route and service integration.
  - Updates via authorized metadata updates with signature verification.
  - Discovery and listing with filters and ordering by bags_score.

```mermaid
flowchart TD
Start(["Create Agent"]) --> Insert["Insert into agent_identities"]
Insert --> Defaults["Apply defaults (status, scores, counters)"]
Defaults --> Return["Return created agent"]
Return --> End(["Done"])
```

**Diagram sources**
- [queries.js:17-29](file://backend/src/models/queries.js#L17-L29)
- [register.js:133-142](file://backend/src/routes/register.js#L133-L142)

**Section sources**
- [queries.js:17-29](file://backend/src/models/queries.js#L17-L29)
- [register.js:133-142](file://backend/src/routes/register.js#L133-L142)
- [agents.js:120-248](file://backend/src/routes/agents.js#L120-L248)

### agent_verifications: Challenge-Response Tracking
- Design philosophy: One-time use, time-bound challenges to prevent replay attacks while enabling lightweight verification.
- Primary key: id (SERIAL); unique constraint on nonce; foreign key to agent_identities.
- Expiration and completion:
  - expires_at enforced by service logic and query filters.
  - completed flag ensures a nonce cannot be reused.
- Representative usage:
  - Issue challenge via route → service → persistence.
  - Verify response via route → service → signature check → mark completed → update last_verified.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Route as "verify.js"
participant Service as "pkiChallenge.js"
participant DB as "queries.js"
Client->>Route : POST /verify/challenge {pubkey}
Route->>Service : issueChallenge(pubkey)
Service->>DB : createVerification(...)
DB-->>Service : verification row
Service-->>Route : {nonce, challenge, expiresIn}
Route-->>Client : challenge data
Client->>Route : POST /verify/response {pubkey, nonce, signature}
Route->>Service : verifyChallenge(pubkey, nonce, signature)
Service->>DB : getVerification(pubkey, nonce)
Service->>Service : verify Ed25519 signature
Service->>DB : completeVerification(nonce)
Service->>DB : updateLastVerified(pubkey)
Service-->>Route : {verified, pubkey, timestamp}
Route-->>Client : success
```

**Diagram sources**
- [verify.js:17-46](file://backend/src/routes/verify.js#L17-L46)
- [verify.js:52-109](file://backend/src/routes/verify.js#L52-L109)
- [pkiChallenge.js:17-39](file://backend/src/services/pkiChallenge.js#L17-L39)
- [pkiChallenge.js:49-96](file://backend/src/services/pkiChallenge.js#L49-L96)
- [queries.js:213-222](file://backend/src/models/queries.js#L213-L222)
- [queries.js:230-240](file://backend/src/models/queries.js#L230-L240)
- [queries.js:247-256](file://backend/src/models/queries.js#L247-L256)
- [queries.js:134-143](file://backend/src/models/queries.js#L134-L143)

**Section sources**
- [pkiChallenge.js:17-39](file://backend/src/services/pkiChallenge.js#L17-L39)
- [pkiChallenge.js:49-96](file://backend/src/services/pkiChallenge.js#L49-L96)
- [queries.js:213-222](file://backend/src/models/queries.js#L213-L222)
- [queries.js:230-240](file://backend/src/models/queries.js#L230-L240)
- [queries.js:247-256](file://backend/src/models/queries.js#L247-L256)
- [queries.js:134-143](file://backend/src/models/queries.js#L134-L143)

### agent_flags: Community Moderation System
- Design philosophy: Structured reporting with JSONB evidence and administrative resolution.
- Primary key: id; foreign key to agent_identities; resolved flag indicates administrative action.
- Representative usage:
  - Submit flag via service → persist with JSONB evidence.
  - Retrieve flags and unresolved counts for reputation computation.
  - Resolve flags through administrative actions.

```mermaid
flowchart TD
Start(["Submit Flag"]) --> Validate["Validate reporter + reason"]
Validate --> Persist["Persist to agent_flags"]
Persist --> Evidence["Store evidence as JSONB"]
Evidence --> Return["Return created flag"]
Return --> End(["Done"])
```

**Diagram sources**
- [queries.js:267-279](file://backend/src/models/queries.js#L267-L279)
- [bagsReputation.js:78-90](file://backend/src/services/bagsReputation.js#L78-L90)

**Section sources**
- [queries.js:267-279](file://backend/src/models/queries.js#L267-L279)
- [queries.js:299-305](file://backend/src/models/queries.js#L299-L305)
- [bagsReputation.js:78-90](file://backend/src/services/bagsReputation.js#L78-L90)

### Schema Evolution and Design Decisions
- From build plan to schema:
  - The build plan defines the three core tables and their relationships, emphasizing PKI challenge-response and reputation computation.
  - The migration script creates tables with precise data types, constraints, and indexes aligned with the build plan.
- Design choices:
  - agent_identities as the central hub for identity and reputation.
  - agent_verifications enforcing time-bound, single-use challenges.
  - agent_flags supporting structured moderation with JSONB evidence.
  - JSONB for capability_set and evidence to enable flexible querying and future extensibility.

**Section sources**
- [agentid_build_plan.md:87-130](file://agentid_build_plan.md#L87-L130)
- [migrate.js:9-65](file://backend/src/models/migrate.js#L9-L65)

## Dependency Analysis
The schema depends on configuration for timeouts and caching, and is consumed by services and routes. External dependencies include Bags and SAID APIs, which influence data availability and scoring.

```mermaid
graph LR
CFG["config/index.js"] --> DB["db.js"]
CFG --> SVC1["pkiChallenge.js"]
CFG --> SVC2["bagsReputation.js"]
CFG --> SVC3["saidBinding.js"]
SVC1 --> Q["queries.js"]
SVC2 --> Q
SVC3 --> Q
R1["routes/verify.js"] --> SVC1
R2["routes/agents.js"] --> SVC2
R4["routes/register.js"] --> SVC3
Q --> DB
```

**Diagram sources**
- [config/index.js:6-28](file://backend/src/config/index.js#L6-L28)
- [db.js:1-45](file://backend/src/models/db.js#L1-L45)
- [pkiChallenge.js:1-102](file://backend/src/services/pkiChallenge.js#L1-L102)
- [bagsReputation.js:1-146](file://backend/src/services/bagsReputation.js#L1-L146)
- [saidBinding.js:1-119](file://backend/src/services/saidBinding.js#L1-L119)
- [verify.js:1-112](file://backend/src/routes/verify.js#L1-L112)
- [agents.js:1-251](file://backend/src/routes/agents.js#L1-L251)
- [register.js:1-156](file://backend/src/routes/register.js#L1-L156)
- [queries.js:1-404](file://backend/src/models/queries.js#L1-L404)

**Section sources**
- [config/index.js:6-28](file://backend/src/config/index.js#L6-L28)
- [db.js:1-45](file://backend/src/models/db.js#L1-L45)
- [queries.js:1-404](file://backend/src/models/queries.js#L1-L404)

## Performance Considerations
- Indexes
  - Status and BAGS score indexes support fast filtering and sorting for discovery and listing.
  - Composite indexes on flags improve moderation queries.
- Query patterns
  - Parameterized queries prevent injection and leverage prepared statement plans.
  - JSONB containment operators enable efficient capability filtering.
- Operational notes
  - Challenge expiration and one-time use reduce stale data and replay risk.
  - Reputation recomputation is selective and driven by explicit requests.

**Section sources**
- [migrate.js:58-65](file://backend/src/models/migrate.js#L58-L65)
- [queries.js:80-109](file://backend/src/models/queries.js#L80-L109)
- [queries.js:332-357](file://backend/src/models/queries.js#L332-L357)

## Troubleshooting Guide
Common issues and resolutions:
- Challenge not found or expired
  - Symptoms: Verification endpoints return not found or expired errors.
  - Causes: Nonce reuse, expired challenge, or incorrect parameters.
  - Resolution: Issue a new challenge; ensure nonce uniqueness and timely responses.
- Invalid signature or encoding
  - Symptoms: Signature verification failures.
  - Causes: Incorrect message format, encoding issues, or mismatched pubkey/signature.
  - Resolution: Confirm challenge message format and base58 encoding; reissue challenge if needed.
- Agent not found
  - Symptoms: Registration and verification routes return 404.
  - Causes: Missing pubkey or unregistered agent.
  - Resolution: Ensure agent is registered; verify pubkey correctness.
- Flagging and moderation
  - Symptoms: Flags not appearing or unresolved counts incorrect.
  - Causes: Missing JSONB evidence or unresolved flags.
  - Resolution: Submit structured evidence; resolve flags administratively.

**Section sources**
- [verify.js:84-104](file://backend/src/routes/verify.js#L84-L104)
- [pkiChallenge.js:54-83](file://backend/src/services/pkiChallenge.js#L54-L83)
- [agents.js:177-184](file://backend/src/routes/agents.js#L177-L184)
- [queries.js:299-305](file://backend/src/models/queries.js#L299-L305)

## Conclusion
The AgentID schema is a normalized, constraint-rich design that supports robust identity management, PKI-based verification, and community moderation. The three core tables—agent_identities, agent_verifications, and agent_flags—work together to enforce strong authenticity guarantees, maintain transparent reputation signals, and enable scalable discovery. The migration script and query layer ensure consistent schema evolution and efficient access patterns aligned with the build plan and operational needs.