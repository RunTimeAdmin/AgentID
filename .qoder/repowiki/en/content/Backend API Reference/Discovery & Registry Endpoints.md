# Discovery & Registry Endpoints

<cite>
**Referenced Files in This Document**
- [server.js](file://backend/server.js)
- [agents.js](file://backend/src/routes/agents.js)
- [attestations.js](file://backend/src/routes/attestations.js)
- [queries.js](file://backend/src/models/queries.js)
- [migrate.js](file://backend/src/models/migrate.js)
- [transform.js](file://backend/src/utils/transform.js)
- [bagsReputation.js](file://backend/src/services/bagsReputation.js)
- [api.js](file://frontend/src/lib/api.js)
- [Registry.jsx](file://frontend/src/pages/Registry.jsx)
- [FlagModal.jsx](file://frontend/src/components/FlagModal.jsx)
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
This document provides comprehensive API documentation for AgentID's discovery and registry endpoints. It covers:
- Agent registry listing with filtering and pagination
- Agent detail retrieval with reputation scoring
- Agent attestation submissions
- Community flagging mechanism
- Moderation workflows and automatic status updates
- Frontend integration patterns and examples

The documentation focuses on the `/agents` GET endpoint for registry listing, the `/agents/:pubkey/attest` POST endpoint for attestation submissions, and the `/agents/:pubkey/flag` POST endpoint for community flagging. It includes query parameters, response schemas, and practical examples.

## Project Structure
The API is implemented using Express.js with PostgreSQL persistence. The backend exposes REST endpoints organized by feature modules:
- Routes: `/agents`, `/discover`, `/agents/:pubkey`, `/agents/:pubkey/update`
- Attestation routes: `/agents/:pubkey/attest`, `/agents/:pubkey/flag`, `/agents/:pubkey/attestations`, `/agents/:pubkey/flags`
- Models: database queries and transformations
- Services: reputation computation and external integrations
- Frontend: API client and UI components for registry browsing and flagging

```mermaid
graph TB
Client["Client Applications"] --> Express["Express Server"]
Express --> AgentsRoutes["Agents Routes<br/>GET /agents<br/>GET /agents/:pubkey<br/>GET /discover<br/>PUT /agents/:pubkey/update"]
Express --> AttestRoutes["Attestation Routes<br/>POST /agents/:pubkey/attest<br/>POST /agents/:pubkey/flag<br/>GET /agents/:pubkey/attestations<br/>GET /agents/:pubkey/flags"]
AgentsRoutes --> Queries["Queries Module"]
AttestRoutes --> Queries
Queries --> DB["PostgreSQL Database"]
AgentsRoutes --> Transform["Transform Utilities"]
AttestRoutes --> Reputation["BAGS Reputation Service"]
Reputation --> ExternalAPIs["External APIs<br/>BAGS Analytics<br/>SAID Gateway"]
```

**Diagram sources**
- [server.js:55-62](file://backend/server.js#L55-L62)
- [agents.js:19-114](file://backend/src/routes/agents.js#L19-L114)
- [attestations.js:19-189](file://backend/src/routes/attestations.js#L19-L189)
- [queries.js:1-404](file://backend/src/models/queries.js#L1-L404)
- [transform.js:1-89](file://backend/src/utils/transform.js#L1-L89)
- [bagsReputation.js:1-146](file://backend/src/services/bagsReputation.js#L1-L146)

**Section sources**
- [server.js:55-62](file://backend/server.js#L55-L62)
- [agents.js:19-114](file://backend/src/routes/agents.js#L19-L114)
- [attestations.js:19-189](file://backend/src/routes/attestations.js#L19-L189)

## Core Components

### Agent Registry Endpoint
The primary registry endpoint lists agents with optional filtering and pagination:
- Path: `GET /agents`
- Query parameters:
  - `status`: Filter by agent status (e.g., verified, flagged)
  - `capability`: Filter by capability (exact match against capability set)
  - `limit`: Maximum number of results (default 50, max 100)
  - `offset`: Pagination offset (default 0)
- Response schema:
  - `agents`: Array of agent profiles (transformed to camelCase)
  - `total`: Total count matching filters
  - `limit`: Applied limit
  - `offset`: Applied offset

### Agent Detail Endpoint
Retrieves a single agent with reputation details:
- Path: `GET /agents/:pubkey`
- Path parameters:
  - `pubkey`: Agent public key
- Response schema:
  - `agent`: Transformed agent profile
  - `reputation`: Computed BAGS score with label and breakdown

### Discovery Endpoint
A2A discovery for capability-based matching:
- Path: `GET /discover`
- Query parameters:
  - `capability`: Required capability to match
- Response schema:
  - `agents`: Verified agents matching the capability
  - `capability`: Provided capability
  - `count`: Number of matched agents

### Attestation Submission Endpoint
Records successful/failed action outcomes:
- Path: `POST /agents/:pubkey/attest`
- Path parameters:
  - `pubkey`: Agent public key
- Request body:
  - `success`: Boolean indicating outcome
  - `action`: Optional action identifier
- Response schema:
  - `pubkey`: Agent public key
  - `success`: Outcome recorded
  - `action`: Provided action identifier
  - `totalActions`, `successfulActions`, `failedActions`: Updated counters
  - `bagsScore`: Updated BAGS score

### Flag Reporting Endpoint
Community flagging of suspicious behavior:
- Path: `POST /agents/:pubkey/flag`
- Path parameters:
  - `pubkey`: Agent public key
- Request body:
  - `reporterPubkey`: Reporter's public key (optional)
  - `reason`: Non-empty reason for flagging
  - `evidence`: Optional JSON evidence
- Response schema:
  - `flag`: Created flag record
  - `unresolved_flags`: Current unresolved flag count
  - `auto_flagged`: Indicates automatic status change to flagged

### Moderation Workflow
Automatic moderation triggers when unresolved flags reach threshold:
- Threshold: 3 unresolved flags
- Automatic status: Updates agent status to flagged
- Note: Signature verification for reporter identity is planned but not yet implemented

**Section sources**
- [agents.js:23-55](file://backend/src/routes/agents.js#L23-L55)
- [agents.js:61-87](file://backend/src/routes/agents.js#L61-L87)
- [agents.js:93-114](file://backend/src/routes/agents.js#L93-L114)
- [attestations.js:25-72](file://backend/src/routes/attestations.js#L25-L72)
- [attestations.js:82-131](file://backend/src/routes/attestations.js#L82-L131)

## Architecture Overview

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Express Server"
participant Agents as "Agents Routes"
participant Queries as "Queries Module"
participant DB as "PostgreSQL"
participant Transform as "Transform Utils"
participant Reputation as "BAGS Reputation"
Client->>Server : GET /agents?status=verified&capability=bags.swap.v1&limit=20&offset=0
Server->>Agents : Route handler
Agents->>Queries : listAgents({status, capability, limit, offset})
Queries->>DB : SELECT ... WHERE status=? AND capability_set @> ? : : jsonb ORDER BY bags_score DESC LIMIT ? OFFSET ?
DB-->>Queries : Agent rows
Queries-->>Agents : Agent rows
Agents->>Transform : transformAgents(rows)
Transform-->>Agents : Agent profiles (camelCase)
Agents->>Queries : countAgents({status, capability})
Queries->>DB : SELECT COUNT(*) FROM agent_identities WHERE 1=1 AND status=? AND capability_set @> ? : : jsonb
DB-->>Queries : Count
Queries-->>Agents : Total count
Agents-->>Client : {agents[], total, limit, offset}
Client->>Server : GET /agents/ : pubkey
Server->>Agents : Route handler
Agents->>Queries : getAgent(pubkey)
Queries->>DB : SELECT * FROM agent_identities WHERE pubkey=?
DB-->>Queries : Agent row
Queries-->>Agents : Agent row
Agents->>Reputation : computeBagsScore(pubkey)
Reputation-->>Agents : {score, label, breakdown}
Agents-->>Client : {agent, reputation}
```

**Diagram sources**
- [agents.js:23-87](file://backend/src/routes/agents.js#L23-L87)
- [queries.js:80-109](file://backend/src/models/queries.js#L80-L109)
- [queries.js:359-375](file://backend/src/models/queries.js#L359-L375)
- [transform.js:43-65](file://backend/src/utils/transform.js#L43-L65)
- [bagsReputation.js:16-122](file://backend/src/services/bagsReputation.js#L16-L122)

## Detailed Component Analysis

### Agent Registry Listing (`/agents`)
The registry endpoint supports:
- Filtering by status and capability
- Pagination with configurable limits
- Sorting by BAGS score (descending)
- Response transformation to camelCase for frontend compatibility

```mermaid
flowchart TD
Start(["GET /agents"]) --> ParseParams["Parse query params<br/>status, capability, limit, offset"]
ParseParams --> ValidateLimits["Validate and cap limit<br/>(<= 100)"]
ValidateLimits --> BuildQuery["Build filtered query<br/>WHERE status=? AND capability_set @> ?::jsonb"]
BuildQuery --> ExecuteList["Execute listAgents()"]
ExecuteList --> ExecuteCount["Execute countAgents()"]
ExecuteCount --> Transform["Transform agents to camelCase"]
Transform --> Respond["Return {agents[], total, limit, offset}"]
```

**Diagram sources**
- [agents.js:23-55](file://backend/src/routes/agents.js#L23-L55)
- [queries.js:80-109](file://backend/src/models/queries.js#L80-L109)
- [queries.js:359-375](file://backend/src/models/queries.js#L359-L375)
- [transform.js:43-65](file://backend/src/utils/transform.js#L43-L65)

**Section sources**
- [agents.js:23-55](file://backend/src/routes/agents.js#L23-L55)
- [queries.js:80-109](file://backend/src/models/queries.js#L80-L109)
- [queries.js:359-375](file://backend/src/models/queries.js#L359-L375)
- [transform.js:43-65](file://backend/src/utils/transform.js#L43-L65)

### Agent Detail Retrieval (`/agents/:pubkey`)
Retrieves agent details and computes reputation:
- Fetches agent by public key
- Computes BAGS score with detailed breakdown
- Returns transformed agent profile with reputation metadata

```mermaid
sequenceDiagram
participant Client as "Client"
participant Agents as "Agents Routes"
participant Queries as "Queries Module"
participant Reputation as "BAGS Reputation"
Client->>Agents : GET /agents/ : pubkey
Agents->>Queries : getAgent(pubkey)
Queries-->>Agents : Agent row
Agents->>Reputation : computeBagsScore(pubkey)
Reputation-->>Agents : {score, label, breakdown}
Agents-->>Client : {agent : transformed, reputation : {score, label, breakdown}}
```

**Diagram sources**
- [agents.js:61-87](file://backend/src/routes/agents.js#L61-L87)
- [queries.js:36-39](file://backend/src/models/queries.js#L36-L39)
- [bagsReputation.js:16-122](file://backend/src/services/bagsReputation.js#L16-L122)

**Section sources**
- [agents.js:61-87](file://backend/src/routes/agents.js#L61-L87)
- [bagsReputation.js:16-122](file://backend/src/services/bagsReputation.js#L16-L122)

### Discovery Endpoint (`/discover`)
A2A discovery for capability-based matching:
- Filters verified agents by capability
- Returns top agents sorted by BAGS score
- Supports optional capability parameter

```mermaid
flowchart TD
Start(["GET /discover"]) --> ValidateCapability["Validate capability parameter"]
ValidateCapability --> BuildQuery["Build query for verified agents<br/>with capability match"]
BuildQuery --> ExecuteQuery["Execute discoverAgents()"]
ExecuteQuery --> Transform["Transform agents to camelCase"]
Transform --> Respond["Return {agents[], capability, count}"]
```

**Diagram sources**
- [agents.js:93-114](file://backend/src/routes/agents.js#L93-L114)
- [queries.js:332-357](file://backend/src/models/queries.js#L332-L357)

**Section sources**
- [agents.js:93-114](file://backend/src/routes/agents.js#L93-L114)
- [queries.js:332-357](file://backend/src/models/queries.js#L332-L357)

### Attestation Submission (`/agents/:pubkey/attest`)
Records action outcomes and updates reputation:
- Validates success boolean
- Increments action counters
- Refreshes BAGS score on successful actions
- Returns updated agent metrics

```mermaid
sequenceDiagram
participant Client as "Client"
participant Attest as "Attestation Routes"
participant Queries as "Queries Module"
participant Reputation as "BAGS Reputation"
Client->>Attest : POST /agents/ : pubkey/attest {success, action}
Attest->>Queries : getAgent(pubkey)
Queries-->>Attest : Agent row
Attest->>Queries : incrementActions(pubkey, success)
Queries-->>Attest : Updated agent row
Attest->>Reputation : refreshAndStoreScore(pubkey) (on success)
Reputation-->>Attest : Updated score
Attest-->>Client : {pubkey, success, action, totalActions, successfulActions, failedActions, bagsScore}
```

**Diagram sources**
- [attestations.js:25-72](file://backend/src/routes/attestations.js#L25-L72)
- [queries.js:168-180](file://backend/src/models/queries.js#L168-L180)
- [bagsReputation.js:129-140](file://backend/src/services/bagsReputation.js#L129-L140)

**Section sources**
- [attestations.js:25-72](file://backend/src/routes/attestations.js#L25-L72)
- [queries.js:168-180](file://backend/src/models/queries.js#L168-L180)
- [bagsReputation.js:129-140](file://backend/src/services/bagsReputation.js#L129-L140)

### Flag Reporting (`/agents/:pubkey/flag`)
Community flagging with automatic moderation:
- Validates reporterPubkey and reason
- Creates flag record
- Counts unresolved flags
- Auto-flags agents with 3+ unresolved flags
- Returns flag creation details

```mermaid
sequenceDiagram
participant Client as "Client"
participant Flags as "Attestation Routes"
participant Queries as "Queries Module"
Client->>Flags : POST /agents/ : pubkey/flag {reporterPubkey, reason, evidence}
Flags->>Queries : getAgent(pubkey)
Queries-->>Flags : Agent row
Flags->>Queries : createFlag({pubkey, reporterPubkey, reason, evidence})
Queries-->>Flags : Created flag
Flags->>Queries : getUnresolvedFlagCount(pubkey)
Queries-->>Flags : Count
alt Count >= 3 and status != flagged
Flags->>Queries : updateAgentStatus(pubkey, 'flagged')
Queries-->>Flags : Updated agent
end
Flags-->>Client : {flag, unresolved_flags, auto_flagged}
```

**Diagram sources**
- [attestations.js:82-131](file://backend/src/routes/attestations.js#L82-L131)
- [queries.js:267-305](file://backend/src/models/queries.js#L267-L305)

**Section sources**
- [attestations.js:82-131](file://backend/src/routes/attestations.js#L82-L131)
- [queries.js:267-305](file://backend/src/models/queries.js#L267-L305)

### Data Model and Transformation
The backend uses a unified transformation layer to convert database rows to camelCase for API responses and maps capability sets appropriately.

```mermaid
classDiagram
class AgentIdentity {
+string pubkey
+string name
+string description
+string tokenMint
+string bagsApiKeyId
+boolean saidRegistered
+boolean saidTrustScore
+array capabilitySet
+string creatorX
+string creatorWallet
+datetime registeredAt
+datetime lastVerified
+string status
+string flagReason
+integer bagsScore
+integer totalActions
+integer successfulActions
+integer failedActions
+integer feeClaimsCount
+decimal feeClaimsSol
+integer swapsCount
+integer launchesCount
}
class AgentFlags {
+integer id
+string pubkey
+string reporterPubkey
+string reason
+jsonb evidence
+datetime createdAt
+boolean resolved
}
class AgentVerifications {
+integer id
+string pubkey
+string nonce
+text challenge
+datetime expiresAt
+boolean completed
+datetime createdAt
}
```

**Diagram sources**
- [migrate.js:11-56](file://backend/src/models/migrate.js#L11-L56)

**Section sources**
- [migrate.js:11-56](file://backend/src/models/migrate.js#L11-L56)
- [transform.js:43-65](file://backend/src/utils/transform.js#L43-L65)

## Dependency Analysis

```mermaid
graph TB
subgraph "Routes"
AgentsRoutes["agents.js"]
AttestRoutes["attestations.js"]
end
subgraph "Models"
Queries["queries.js"]
DB["migrate.js"]
end
subgraph "Utilities"
Transform["transform.js"]
Config["config/index.js"]
end
subgraph "Services"
Reputation["bagsReputation.js"]
end
subgraph "Frontend"
ApiClient["api.js"]
RegistryPage["Registry.jsx"]
FlagModal["FlagModal.jsx"]
end
AgentsRoutes --> Queries
AttestRoutes --> Queries
AgentsRoutes --> Transform
AttestRoutes --> Transform
AgentsRoutes --> Reputation
AttestRoutes --> Reputation
Queries --> DB
ApiClient --> AgentsRoutes
ApiClient --> AttestRoutes
RegistryPage --> ApiClient
FlagModal --> ApiClient
```

**Diagram sources**
- [agents.js:9-12](file://backend/src/routes/agents.js#L9-L12)
- [attestations.js:7-17](file://backend/src/routes/attestations.js#L7-L17)
- [queries.js:6](file://backend/src/models/queries.js#L6)
- [transform.js:12](file://backend/src/utils/transform.js#L12)
- [bagsReputation.js:9](file://backend/src/services/bagsReputation.js#L9)
- [api.js:35-137](file://frontend/src/lib/api.js#L35-L137)

**Section sources**
- [agents.js:9-12](file://backend/src/routes/agents.js#L9-L12)
- [attestations.js:7-17](file://backend/src/routes/attestations.js#L7-L17)
- [queries.js:6](file://backend/src/models/queries.js#L6)
- [transform.js:12](file://backend/src/utils/transform.js#L12)
- [bagsReputation.js:9](file://backend/src/services/bagsReputation.js#L9)
- [api.js:35-137](file://frontend/src/lib/api.js#L35-L137)

## Performance Considerations
- Pagination limits: The registry enforces a maximum limit of 100 to prevent excessive load.
- Database indexing: Strategic indexes on status, BAGS score, and flag resolution improve query performance.
- JSONB operations: Capability filtering uses PostgreSQL JSONB containment operators for efficient matching.
- Reputation caching: BAGS score computation integrates with external APIs; consider caching strategies for high-traffic scenarios.
- Rate limiting: Default rate limiter protects endpoints from abuse while allowing reasonable throughput.

## Troubleshooting Guide
Common issues and resolutions:
- Agent not found errors: Ensure the pubkey exists in the database before querying details or submitting attestations.
- Invalid signature errors: For agent updates, verify Ed25519 signatures and timestamp windows.
- Flag submission failures: Validate reporterPubkey and reason fields; ensure evidence is valid JSON when provided.
- Excessive pagination: Respect the maximum limit of 100 per page to avoid performance degradation.
- Reputation computation timeouts: External API calls may fail; implement retry logic and fallback scoring.

**Section sources**
- [agents.js:120-247](file://backend/src/routes/agents.js#L120-L247)
- [attestations.js:25-131](file://backend/src/routes/attestations.js#L25-L131)

## Conclusion
The AgentID discovery and registry endpoints provide a robust foundation for agent discovery, reputation management, and community moderation. The API supports capability-based filtering, comprehensive pagination, and integrated reputation scoring. The attestation and flagging mechanisms enable community-driven quality assurance with automated moderation workflows. The frontend components demonstrate practical integration patterns for registry browsing and flag reporting.