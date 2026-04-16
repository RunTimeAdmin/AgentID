# Api Reference

<cite>
**Referenced Files in This Document**
- [server.js](file://backend/server.js)
- [agents.js](file://backend/src/routes/agents.js)
- [attestations.js](file://backend/src/routes/attestations.js)
- [badge.js](file://backend/src/routes/badge.js)
- [register.js](file://backend/src/routes/register.js)
- [reputation.js](file://backend/src/routes/reputation.js)
- [verify.js](file://backend/src/routes/verify.js)
- [widget.js](file://backend/src/routes/widget.js)
- [queries.js](file://backend/src/models/queries.js)
- [bagsReputation.js](file://backend/src/services/bagsReputation.js)
- [badgeBuilder.js](file://backend/src/services/badgeBuilder.js)
- [bagsAuthVerifier.js](file://backend/src/services/bagsAuthVerifier.js)
- [saidBinding.js](file://backend/src/services/saidBinding.js)
- [pkiChallenge.js](file://backend/src/services/pkiChallenge.js)
- [rateLimit.js](file://backend/src/middleware/rateLimit.js)
- [transform.js](file://backend/src/utils/transform.js)
- [config/index.js](file://backend/src/config/index.js)
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
This document provides a comprehensive API reference for the AgentID backend service. It describes all HTTP endpoints, request/response schemas, authentication requirements, rate limits, and error handling behavior. The API enables agent registration, verification, reputation computation, attestation recording, flagging, badge generation, and discovery.

## Project Structure
The backend is an Express.js application that mounts route modules under specific prefixes. Middleware applies global security and rate limiting. Services encapsulate external integrations (BAGS, SAID, PKI), while models handle database queries.

```mermaid
graph TB
Client["Client"]
ExpressApp["Express App<br/>server.js"]
CORS["CORS<br/>config/index.js"]
Helmet["Helmet<br/>security"]
RateLimit["Rate Limit<br/>rateLimit.js"]
RoutesReg["Routes: register.js"]
RoutesVerify["Routes: verify.js"]
RoutesBadge["Routes: badge.js"]
RoutesRep["Routes: reputation.js"]
RoutesAgents["Routes: agents.js"]
RoutesAttest["Routes: attestations.js"]
RoutesWidget["Routes: widget.js"]
Models["Models: queries.js"]
ServicesRep["Services: bagsReputation.js"]
ServicesBadge["Services: badgeBuilder.js"]
ServicesBags["Services: bagsAuthVerifier.js"]
ServicesSAID["Services: saidBinding.js"]
ServicesPKI["Services: pkiChallenge.js"]
Utils["Utils: transform.js"]
Config["Config: config/index.js"]
Client --> ExpressApp
ExpressApp --> Helmet
ExpressApp --> CORS
ExpressApp --> RateLimit
ExpressApp --> RoutesReg
ExpressApp --> RoutesVerify
ExpressApp --> RoutesBadge
ExpressApp --> RoutesRep
ExpressApp --> RoutesAgents
ExpressApp --> RoutesAttest
ExpressApp --> RoutesWidget
RoutesReg --> ServicesBags
RoutesReg --> ServicesSAID
RoutesReg --> Models
RoutesReg --> Utils
RoutesVerify --> ServicesPKI
RoutesVerify --> Models
RoutesVerify --> Utils
RoutesBadge --> ServicesBadge
RoutesBadge --> Models
RoutesBadge --> Utils
RoutesRep --> ServicesRep
RoutesRep --> Models
RoutesRep --> Utils
RoutesAgents --> Models
RoutesAgents --> ServicesRep
RoutesAgents --> Utils
RoutesAttest --> Models
RoutesAttest --> ServicesRep
RoutesAttest --> Utils
RoutesWidget --> ServicesBadge
RoutesWidget --> Models
RoutesWidget --> Utils
ServicesRep --> Models
ServicesRep --> ServicesSAID
ServicesBadge --> Models
ServicesBadge --> ServicesRep
ServicesBags --> Config
ServicesSAID --> Config
ServicesPKI --> Models
ServicesPKI --> Config
Utils --> Config
```

**Diagram sources**
- [server.js:1-104](file://backend/server.js#L1-L104)
- [register.js:1-160](file://backend/src/routes/register.js#L1-L160)
- [verify.js:1-121](file://backend/src/routes/verify.js#L1-L121)
- [badge.js:1-58](file://backend/src/routes/badge.js#L1-L58)
- [reputation.js:1-44](file://backend/src/routes/reputation.js#L1-L44)
- [agents.js:1-255](file://backend/src/routes/agents.js#L1-L255)
- [attestations.js:1-241](file://backend/src/routes/attestations.js#L1-L241)
- [widget.js:1-89](file://backend/src/routes/widget.js#L1-L89)
- [queries.js:1-404](file://backend/src/models/queries.js#L1-L404)
- [bagsReputation.js:1-146](file://backend/src/services/bagsReputation.js#L1-L146)
- [badgeBuilder.js:1-497](file://backend/src/services/badgeBuilder.js#L1-L497)
- [bagsAuthVerifier.js:1-93](file://backend/src/services/bagsAuthVerifier.js#L1-L93)
- [saidBinding.js:1-119](file://backend/src/services/saidBinding.js#L1-L119)
- [pkiChallenge.js:1-102](file://backend/src/services/pkiChallenge.js#L1-L102)
- [rateLimit.js:1-62](file://backend/src/middleware/rateLimit.js#L1-L62)
- [transform.js:1-103](file://backend/src/utils/transform.js#L1-L103)
- [config/index.js:1-31](file://backend/src/config/index.js#L1-L31)

**Section sources**
- [server.js:1-104](file://backend/server.js#L1-L104)
- [config/index.js:1-31](file://backend/src/config/index.js#L1-L31)

## Core Components
- Route modules define endpoint contracts and orchestrate service/model interactions.
- Services encapsulate external integrations and business logic.
- Models provide parameterized database operations.
- Utilities handle data transformation and validation.
- Middleware enforces rate limits and security headers.

**Section sources**
- [agents.js:1-255](file://backend/src/routes/agents.js#L1-L255)
- [attestations.js:1-241](file://backend/src/routes/attestations.js#L1-L241)
- [badge.js:1-58](file://backend/src/routes/badge.js#L1-L58)
- [register.js:1-160](file://backend/src/routes/register.js#L1-L160)
- [reputation.js:1-44](file://backend/src/routes/reputation.js#L1-L44)
- [verify.js:1-121](file://backend/src/routes/verify.js#L1-L121)
- [widget.js:1-89](file://backend/src/routes/widget.js#L1-L89)
- [queries.js:1-404](file://backend/src/models/queries.js#L1-L404)
- [bagsReputation.js:1-146](file://backend/src/services/bagsReputation.js#L1-L146)
- [badgeBuilder.js:1-497](file://backend/src/services/badgeBuilder.js#L1-L497)
- [bagsAuthVerifier.js:1-93](file://backend/src/services/bagsAuthVerifier.js#L1-L93)
- [saidBinding.js:1-119](file://backend/src/services/saidBinding.js#L1-L119)
- [pkiChallenge.js:1-102](file://backend/src/services/pkiChallenge.js#L1-L102)
- [rateLimit.js:1-62](file://backend/src/middleware/rateLimit.js#L1-L62)
- [transform.js:1-103](file://backend/src/utils/transform.js#L1-L103)

## Architecture Overview
The API follows a layered architecture:
- Transport: Express routes
- Application: Route handlers call services and models
- Domain: Services implement business logic and integrate with external systems
- Persistence: Models encapsulate SQL queries
- Shared: Utilities and configuration

```mermaid
sequenceDiagram
participant C as "Client"
participant R as "Route Handler"
participant S as "Service"
participant M as "Model"
participant DB as "Database"
C->>R : HTTP Request
R->>S : Invoke business logic
S->>M : Execute query
M->>DB : Parameterized SQL
DB-->>M : Result
M-->>S : Domain object
S-->>R : Response data
R-->>C : HTTP Response
```

**Diagram sources**
- [server.js:69-76](file://backend/server.js#L69-L76)
- [queries.js:17-28](file://backend/src/models/queries.js#L17-L28)
- [bagsReputation.js:16-122](file://backend/src/services/bagsReputation.js#L16-L122)

## Detailed Component Analysis

### Authentication and Authorization
- Registration and verification endpoints enforce strict rate limits and cryptographic verification.
- Registration validates signature against BAGS challenge and ensures nonce inclusion in message.
- Verification uses Ed25519 challenge-response with replay protection via timestamp windows.
- Badge and widget endpoints are open with default rate limits.

**Section sources**
- [register.js:59-157](file://backend/src/routes/register.js#L59-L157)
- [verify.js:18-118](file://backend/src/routes/verify.js#L18-L118)
- [rateLimit.js:44-61](file://backend/src/middleware/rateLimit.js#L44-L61)

### Endpoint Catalog

#### Registration
- POST /register
  - Purpose: Register a new agent with BAGS auth and optional SAID binding.
  - Authentication: Auth limiter.
  - Request body:
    - pubkey: string (required)
    - name: string (required, <= 255 chars)
    - signature: string (required)
    - message: string (required, must include nonce)
    - nonce: string (required)
    - tokenMint?: string
    - capabilities?: string[]
    - creatorX?: string
    - creatorWallet?: string
    - description?: string
  - Responses:
    - 201 Created: { agent: Agent, said: { registered: boolean, error?: string } }
    - 400 Bad Request: { error: string }
    - 401 Unauthorized: { error: string }
    - 409 Conflict: { error: string, pubkey: string }
    - 500 Internal Server Error: { error: string }
  - Notes:
    - Validates Solana pubkey format.
    - Verifies BAGS signature and checks nonce presence.
    - Attempts SAID registration asynchronously; continues on failure.

**Section sources**
- [register.js:59-157](file://backend/src/routes/register.js#L59-L157)
- [bagsAuthVerifier.js:44-57](file://backend/src/services/bagsAuthVerifier.js#L44-L57)
- [saidBinding.js:21-54](file://backend/src/services/saidBinding.js#L21-L54)
- [transform.js:43-55](file://backend/src/utils/transform.js#L43-L55)

#### Verification
- POST /verify/challenge
  - Purpose: Issue a PKI challenge for an agent.
  - Authentication: Auth limiter.
  - Request body: { pubkey: string }
  - Responses: 200 OK { nonce: string, challenge: string, expiresIn: number }, 400/404/500 as applicable.
- POST /verify/response
  - Purpose: Verify the signed challenge response.
  - Authentication: Auth limiter.
  - Request body: { pubkey: string, nonce: string, signature: string }
  - Responses: 200 OK { verified: true, pubkey: string, timestamp: number }, 400/401/404/500 as applicable.

**Section sources**
- [verify.js:18-118](file://backend/src/routes/verify.js#L18-L118)
- [pkiChallenge.js:17-96](file://backend/src/services/pkiChallenge.js#L17-L96)

#### Reputation
- GET /reputation/:pubkey
  - Purpose: Retrieve full BAGS reputation breakdown.
  - Authentication: Default limiter.
  - Path params: pubkey (required)
  - Responses: 200 OK { pubkey: string, score: number, label: string, breakdown: object }, 404/500 as applicable.

**Section sources**
- [reputation.js:17-41](file://backend/src/routes/reputation.js#L17-L41)
- [bagsReputation.js:16-122](file://backend/src/services/bagsReputation.js#L16-L122)

#### Agents
- GET /agents
  - Purpose: List agents with optional filters.
  - Authentication: Default limiter.
  - Query params: status?, capability?, limit? (<= 100), offset?
  - Responses: 200 OK { agents: Agent[], total: number, limit: number, offset: number }
- GET /agents/:pubkey
  - Purpose: Get agent detail with reputation.
  - Authentication: Default limiter.
  - Path params: pubkey (required)
  - Responses: 200 OK { agent: Agent, reputation: { score: number, label: string, breakdown: object } }, 400/404/500 as applicable.
- GET /discover
  - Purpose: Find agents by capability (A2A discovery).
  - Authentication: Default limiter.
  - Query params: capability (required)
  - Responses: 200 OK { agents: Agent[], capability: string, count: number }
- PUT /agents/:pubkey/update
  - Purpose: Update agent metadata with signature verification.
  - Authentication: Auth limiter.
  - Path params: pubkey (required)
  - Request body: { signature: string, timestamp: number, name?: string, tokenMint?: string, capabilities?: string[], creatorX?: string, description?: string }
  - Responses: 200 OK { agent: Agent }, 400/401/404/500 as applicable.

**Section sources**
- [agents.js:23-118](file://backend/src/routes/agents.js#L23-L118)
- [agents.js:124-252](file://backend/src/routes/agents.js#L124-L252)
- [queries.js:80-109](file://backend/src/models/queries.js#L80-L109)
- [queries.js:332-357](file://backend/src/models/queries.js#L332-L357)

#### Attestations
- POST /agents/:pubkey/attest
  - Purpose: Record action success/failure and optionally refresh BAGS score.
  - Authentication: Default limiter.
  - Path params: pubkey (required)
  - Request body: { success: boolean, action?: string }
  - Responses: 200 OK { pubkey: string, success: boolean, action: string|null, totalActions: number, successfulActions: number, failedActions: number, bagsScore: number }, 400/404/500 as applicable.
- POST /agents/:pubkey/flag
  - Purpose: Flag suspicious behavior with cryptographic proof-of-ownership.
  - Authentication: Auth limiter.
  - Path params: pubkey (required)
  - Request body: { reporterPubkey: string, signature: string, timestamp: number, reason: string, evidence?: any }
  - Responses: 201 OK { flag: Flag, unresolved_flags: number, auto_flagged: boolean }, 400/401/404/500 as applicable.
- GET /agents/:pubkey/attestations
  - Purpose: Retrieve agent action stats.
  - Authentication: Default limiter.
  - Path params: pubkey (required)
  - Responses: 200 OK { pubkey: string, totalActions: number, successfulActions: number, failedActions: number, bagsScore: number }
- GET /agents/:pubkey/flags
  - Purpose: Retrieve flags for an agent.
  - Authentication: Default limiter.
  - Path params: pubkey (required)
  - Responses: 200 OK { pubkey: string, flags: Flag[], count: number }

**Section sources**
- [attestations.js:27-74](file://backend/src/routes/attestations.js#L27-L74)
- [attestations.js:80-180](file://backend/src/routes/attestations.js#L80-L180)
- [attestations.js:186-238](file://backend/src/routes/attestations.js#L186-L238)

#### Badge
- GET /badge/:pubkey
  - Purpose: Returns trust badge JSON.
  - Authentication: Default limiter.
  - Path params: pubkey (required)
  - Responses: 200 OK BadgeJSON, 404/500 as applicable.
- GET /badge/:pubkey/svg
  - Purpose: Returns trust badge SVG.
  - Authentication: Default limiter.
  - Path params: pubkey (required)
  - Responses: 200 image/svg+xml, 404/500 as applicable.

**Section sources**
- [badge.js:16-55](file://backend/src/routes/badge.js#L16-L55)
- [badgeBuilder.js:17-83](file://backend/src/services/badgeBuilder.js#L17-L83)
- [badgeBuilder.js:90-162](file://backend/src/services/badgeBuilder.js#L90-L162)

#### Widget
- GET /widget/:pubkey
  - Purpose: Returns embeddable HTML widget.
  - Authentication: Default limiter.
  - Path params: pubkey (required)
  - Responses: 200 text/html, 404 returns error HTML page.

**Section sources**
- [widget.js:18-86](file://backend/src/routes/widget.js#L18-L86)
- [badgeBuilder.js:169-475](file://backend/src/services/badgeBuilder.js#L169-L475)

### Data Models and Schemas

#### Agent
- Fields: pubkey, name, description, tokenMint, bagsApiKeyId, capabilitySet, creatorX, creatorWallet, status, flagReason, bagsScore, totalActions, successfulActions, failedActions, registeredAt, lastVerified.
- Transformed for API responses: capabilitySet mapped to capabilities.

**Section sources**
- [queries.js:17-28](file://backend/src/models/queries.js#L17-L28)
- [transform.js:43-55](file://backend/src/utils/transform.js#L43-L55)

#### BadgeJSON
- Fields: pubkey, name, status, badge, label, score, bags_score, saidTrustScore, saidLabel, registeredAt, lastVerified, totalActions, successRate, capabilities, tokenMint, widgetUrl.

**Section sources**
- [badgeBuilder.js:57-79](file://backend/src/services/badgeBuilder.js#L57-L79)

#### Flag
- Fields: id, pubkey, reporterPubkey, reason, evidence, resolved, createdAt.

**Section sources**
- [queries.js:267-279](file://backend/src/models/queries.js#L267-L279)

### Processing Logic

#### Registration Flow
```mermaid
sequenceDiagram
participant Client as "Client"
participant Reg as "POST /register"
participant Verifier as "BAGS Verifier"
participant SAID as "SAID Gateway"
participant DB as "Queries"
Client->>Reg : Submit {pubkey,name,signature,message,nonce,...}
Reg->>Verifier : verifyBagsSignature(message, signature, pubkey)
Verifier-->>Reg : isValid
Reg->>DB : getAgent(pubkey)
DB-->>Reg : existingAgent
Reg->>SAID : registerWithSAID(...)
SAID-->>Reg : result or null
Reg->>DB : createAgent({...})
DB-->>Reg : agent
Reg-->>Client : {agent, said}
```

**Diagram sources**
- [register.js:59-157](file://backend/src/routes/register.js#L59-L157)
- [bagsAuthVerifier.js:44-57](file://backend/src/services/bagsAuthVerifier.js#L44-L57)
- [saidBinding.js:21-54](file://backend/src/services/saidBinding.js#L21-L54)
- [queries.js:17-28](file://backend/src/models/queries.js#L17-L28)

#### Reputation Computation
```mermaid
flowchart TD
Start(["Compute BAGS Score"]) --> LoadAgent["Load Agent"]
LoadAgent --> Fee["Fetch Token Fees (BAGS)"]
Fee --> SuccessRate["Compute Success Rate"]
SuccessRate --> Age["Compute Registration Age"]
Age --> SAIDTrust["Fetch SAID Trust Score"]
SAIDTrust --> Flags["Count Unresolved Flags"]
Flags --> Sum["Sum Factors (<=100)"]
Sum --> Label["Map Label (UNVERIFIED|LOW|MEDIUM|HIGH)"]
Label --> End(["Return {score,label,breakdown,saidScore}"])
```

**Diagram sources**
- [bagsReputation.js:16-122](file://backend/src/services/bagsReputation.js#L16-L122)

#### Badge Generation
```mermaid
sequenceDiagram
participant Client as "Client"
participant Badge as "GET /badge/ : pubkey"
participant Cache as "Redis Cache"
participant Rep as "computeBagsScore"
participant DB as "Queries"
Client->>Badge : Request
Badge->>Cache : getCache("badge : <pubkey>")
alt Cache hit
Cache-->>Badge : JSON
else Cache miss
Badge->>DB : getAgent(pubkey)
DB-->>Badge : agent
Badge->>Rep : computeBagsScore(pubkey)
Rep-->>Badge : scoreData
Badge->>Cache : setCache("badge : <pubkey>", JSON, ttl)
end
Badge-->>Client : JSON
```

**Diagram sources**
- [badge.js:16-32](file://backend/src/routes/badge.js#L16-L32)
- [badgeBuilder.js:17-83](file://backend/src/services/badgeBuilder.js#L17-L83)

## Dependency Analysis
- Route modules depend on models for persistence and services for external integrations.
- Services depend on configuration for external endpoints and timeouts.
- Utilities provide shared transformations and validations.
- Middleware applies cross-cutting concerns (security, rate limiting).

```mermaid
graph LR
Routes["Route Modules"] --> Models["Models"]
Routes --> Services["Services"]
Services --> Config["Config"]
Routes --> Utils["Utilities"]
Utils --> Config
Express["Express App"] --> Routes
Express --> Middleware["Middleware"]
```

**Diagram sources**
- [server.js:34-40](file://backend/server.js#L34-L40)
- [config/index.js:6-28](file://backend/src/config/index.js#L6-L28)

**Section sources**
- [server.js:34-40](file://backend/server.js#L34-L40)
- [config/index.js:6-28](file://backend/src/config/index.js#L6-L28)

## Performance Considerations
- Rate limiting: Default 100 requests/15 minutes; auth endpoints limited to 20 requests/15 minutes.
- Pagination: Agent listing enforces a maximum limit of 100 items per page.
- Caching: Badge JSON is cached with TTL; consider tuning BADGE_CACHE_TTL for desired freshness vs. load balance.
- External APIs: BAGS and SAID calls use timeouts; failures are handled gracefully to avoid blocking registration.
- Body size: JSON parser configured for larger payloads (up to 10MB) to support widget and badge payloads.

**Section sources**
- [rateLimit.js:44-61](file://backend/src/middleware/rateLimit.js#L44-L61)
- [agents.js:28-34](file://backend/src/routes/agents.js#L28-L34)
- [badgeBuilder.js:77](file://backend/src/services/badgeBuilder.js#L77)
- [config/index.js:26](file://backend/src/config/index.js#L26)
- [server.js:54-55](file://backend/server.js#L54-L55)

## Troubleshooting Guide
- 400 Bad Request:
  - Invalid Solana pubkey format.
  - Missing or malformed fields in requests (e.g., signature, timestamp, reason).
  - Capability required for discovery.
- 401 Unauthorized:
  - Invalid or expired signature for verification and registration.
  - Signature verification failed for flag/reporter.
- 404 Not Found:
  - Agent not found for requested pubkey.
  - Challenge not found or already completed.
- 409 Conflict:
  - Agent already registered.
- 429 Too Many Requests:
  - Exceeded rate limits; reduce request frequency.
- 5xx Internal Server Error:
  - Database or external service failures; retry after delay.

**Section sources**
- [agents.js:65-67](file://backend/src/routes/agents.js#L65-L67)
- [agents.js:102-106](file://backend/src/routes/agents.js#L102-L106)
- [verify.js:93-113](file://backend/src/routes/verify.js#L93-L113)
- [attestations.js:117-124](file://backend/src/routes/attestations.js#L117-L124)
- [rateLimit.js:37-41](file://backend/src/middleware/rateLimit.js#L37-L41)

## Conclusion
The AgentID API provides a secure, rate-limited interface for agent lifecycle management, reputation computation, attestation recording, and badge/widget generation. Its modular design separates transport, domain logic, persistence, and external integrations, enabling maintainability and scalability.