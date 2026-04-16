# Developer Guide

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [DEVELOPER_GUIDE.md](file://docs/DEVELOPER_GUIDE.md)
- [API_REFERENCE.md](file://docs/API_REFERENCE.md)
- [WIDGET_GUIDE.md](file://docs/WIDGET_GUIDE.md)
- [docker-compose.yml](file://docker-compose.yml)
- [backend/package.json](file://backend/package.json)
- [frontend/package.json](file://frontend/package.json)
- [backend/server.js](file://backend/server.js)
- [backend/src/config/index.js](file://backend/src/config/index.js)
- [backend/src/models/db.js](file://backend/src/models/db.js)
- [backend/src/models/redis.js](file://backend/src/models/redis.js)
- [backend/src/models/queries.js](file://backend/src/models/queries.js)
- [backend/src/services/bagsAuthVerifier.js](file://backend/src/services/bagsAuthVerifier.js)
- [backend/src/services/bagsReputation.js](file://backend/src/services/bagsReputation.js)
- [backend/src/services/pkiChallenge.js](file://backend/src/services/pkiChallenge.js)
- [backend/src/services/saidBinding.js](file://backend/src/services/saidBinding.js)
- [backend/src/services/badgeBuilder.js](file://backend/src/services/badgeBuilder.js)
- [backend/src/routes/register.js](file://backend/src/routes/register.js)
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
10. [Appendices](#appendices)

## Introduction
AgentID is the trust verification layer for Bags agents on Solana. It integrates Bags authentication, binds agent identities to the SAID Identity Gateway, computes a 5-factor reputation score, and exposes human-readable trust badges and embeddable widgets. The backend is a Node.js/Express application with PostgreSQL and Redis, while the frontend is a React/Vite application.

## Project Structure
The repository is organized into:
- backend: Express server, configuration, middleware, models (database and Redis), services (business logic), routes (HTTP endpoints), and tests
- frontend: React application with pages, components, API client, and widget
- docs: API reference, developer guide, and widget guide
- docker-compose.yml: Infrastructure provisioning for PostgreSQL and Redis
- Root README with quick start, API reference, and reputation scoring

```mermaid
graph TB
subgraph "Backend"
S["server.js"]
CFG["config/index.js"]
DB["models/db.js"]
RDS["models/redis.js"]
Q["models/queries.js"]
BA["services/bagsAuthVerifier.js"]
BR["services/bagsReputation.js"]
PC["services/pkiChallenge.js"]
SB["services/saidBinding.js"]
BB["services/badgeBuilder.js"]
RG["routes/register.js"]
end
subgraph "Frontend"
FE["React App"]
W["Widget"]
end
S --> CFG
S --> DB
S --> RDS
S --> RG
RG --> BA
RG --> SB
S --> BB
BB --> BR
BB --> RDS
BR --> SB
BR --> Q
S --> Q
```

**Diagram sources**
- [backend/server.js:1-104](file://backend/server.js#L1-L104)
- [backend/src/config/index.js:1-34](file://backend/src/config/index.js#L1-L34)
- [backend/src/models/db.js:1-71](file://backend/src/models/db.js#L1-L71)
- [backend/src/models/redis.js:1-94](file://backend/src/models/redis.js#L1-L94)
- [backend/src/models/queries.js:1-404](file://backend/src/models/queries.js#L1-L404)
- [backend/src/services/bagsAuthVerifier.js:1-93](file://backend/src/services/bagsAuthVerifier.js#L1-L93)
- [backend/src/services/bagsReputation.js:1-146](file://backend/src/services/bagsReputation.js#L1-L146)
- [backend/src/services/pkiChallenge.js:1-102](file://backend/src/services/pkiChallenge.js#L1-L102)
- [backend/src/services/saidBinding.js:1-119](file://backend/src/services/saidBinding.js#L1-L119)
- [backend/src/services/badgeBuilder.js:1-548](file://backend/src/services/badgeBuilder.js#L1-L548)
- [backend/src/routes/register.js:1-160](file://backend/src/routes/register.js#L1-L160)

**Section sources**
- [README.md:1-104](file://README.md#L1-L104)
- [DEVELOPER_GUIDE.md:327-436](file://docs/DEVELOPER_GUIDE.md#L327-L436)

## Core Components
- Configuration: Centralized environment variables and defaults
- Data Access: PostgreSQL pool and Redis client with caching helpers
- Queries: Parameterized SQL functions for agent, verification, and flag operations
- Services:
  - BagsAuthVerifier: Integrates with Bags API for challenge/init and signature verification
  - BagsReputation: Computes 5-factor reputation score and stores it
  - PKIChallenge: Issues and verifies Ed25519 challenges
  - SAIDBinding: Registers agents and fetches trust scores from SAID Gateway
  - BadgeBuilder: Generates JSON, SVG, and HTML widget outputs with caching
- Routes: HTTP endpoints for registration, verification, badges, reputation, agents, attestations, and widgets
- Security: Helmet, CORS, rate limiting, and health checks

**Section sources**
- [backend/src/config/index.js:1-34](file://backend/src/config/index.js#L1-L34)
- [backend/src/models/db.js:1-71](file://backend/src/models/db.js#L1-L71)
- [backend/src/models/redis.js:1-94](file://backend/src/models/redis.js#L1-L94)
- [backend/src/models/queries.js:1-404](file://backend/src/models/queries.js#L1-L404)
- [backend/src/services/bagsAuthVerifier.js:1-93](file://backend/src/services/bagsAuthVerifier.js#L1-L93)
- [backend/src/services/bagsReputation.js:1-146](file://backend/src/services/bagsReputation.js#L1-L146)
- [backend/src/services/pkiChallenge.js:1-102](file://backend/src/services/pkiChallenge.js#L1-L102)
- [backend/src/services/saidBinding.js:1-119](file://backend/src/services/saidBinding.js#L1-L119)
- [backend/src/services/badgeBuilder.js:1-548](file://backend/src/services/badgeBuilder.js#L1-L548)
- [backend/server.js:1-104](file://backend/server.js#L1-L104)

## Architecture Overview
The backend follows a layered architecture:
- Entry point initializes Express, loads environment, applies security middleware, registers routes, and starts the server
- Routes orchestrate service calls and model queries
- Services encapsulate external integrations and business logic
- Models abstract database and Redis operations
- Frontend consumes the API and renders badges and widgets

```mermaid
graph TB
Client["Client/Browser"] --> Express["Express Server"]
Express --> Helmet["Helmet"]
Express --> CORS["CORS"]
Express --> RateLimit["Rate Limit"]
Express --> Routes["Routes"]
Routes --> Services["Services"]
Services --> DBLayer["Models (DB/Redis)"]
DBLayer --> PG["PostgreSQL"]
DBLayer --> Redis["Redis"]
Services --> Ext["External APIs<br/>Bags, SAID"]
```

**Diagram sources**
- [backend/server.js:44-87](file://backend/server.js#L44-L87)
- [backend/src/services/bagsAuthVerifier.js:11-86](file://backend/src/services/bagsAuthVerifier.js#L11-L86)
- [backend/src/services/saidBinding.js:21-87](file://backend/src/services/saidBinding.js#L21-L87)
- [backend/src/models/db.js:25-43](file://backend/src/models/db.js#L25-L43)
- [backend/src/models/redis.js:9-20](file://backend/src/models/redis.js#L9-L20)

**Section sources**
- [DEVELOPER_GUIDE.md:327-436](file://docs/DEVELOPER_GUIDE.md#L327-L436)

## Detailed Component Analysis

### Registration Flow (POST /register)
End-to-end registration with Bags auth and optional SAID binding:
1. Validate input (pubkey, name, signature, message, nonce)
2. Verify nonce presence in message
3. Verify Bags signature using Ed25519
4. Check for existing agent
5. Optionally register with SAID (non-blocking)
6. Persist agent record
7. Return created agent and SAID status

```mermaid
sequenceDiagram
participant Client as "Client"
participant Route as "register.js"
participant Verifier as "bagsAuthVerifier.js"
participant SAID as "saidBinding.js"
participant DB as "queries.js"
Client->>Route : POST /register {pubkey,name,signature,message,nonce,...}
Route->>Verifier : verifyBagsSignature(message, signature, pubkey)
Verifier-->>Route : boolean
Route->>DB : getAgent(pubkey)
DB-->>Route : agent or null
alt Not found
Route->>SAID : registerWithSAID(...)
SAID-->>Route : result or null
Route->>DB : createAgent(...)
DB-->>Route : agent
Route-->>Client : 201 {agent, said}
else Already exists
Route-->>Client : 409 {error}
end
```

**Diagram sources**
- [backend/src/routes/register.js:59-157](file://backend/src/routes/register.js#L59-L157)
- [backend/src/services/bagsAuthVerifier.js:44-86](file://backend/src/services/bagsAuthVerifier.js#L44-L86)
- [backend/src/services/saidBinding.js:21-54](file://backend/src/services/saidBinding.js#L21-L54)
- [backend/src/models/queries.js:17-29](file://backend/src/models/queries.js#L17-L29)

**Section sources**
- [backend/src/routes/register.js:1-160](file://backend/src/routes/register.js#L1-L160)
- [backend/src/services/bagsAuthVerifier.js:1-93](file://backend/src/services/bagsAuthVerifier.js#L1-L93)
- [backend/src/services/saidBinding.js:1-119](file://backend/src/services/saidBinding.js#L1-L119)
- [backend/src/models/queries.js:1-404](file://backend/src/models/queries.js#L1-L404)

### PKI Challenge-Response (POST /verify/challenge, POST /verify/response)
- Issue challenge: generate nonce, construct challenge string, persist verification record, return base58-encoded challenge
- Verify challenge: fetch pending verification, validate expiration, decode inputs, verify Ed25519 signature, mark complete, update last verified

```mermaid
sequenceDiagram
participant Client as "Client"
participant VerifyRoute as "verify routes"
participant PC as "pkiChallenge.js"
participant DB as "queries.js"
Client->>VerifyRoute : POST /verify/challenge {pubkey}
VerifyRoute->>PC : issueChallenge(pubkey)
PC->>DB : createVerification(...)
DB-->>PC : record
PC-->>VerifyRoute : {nonce, challenge, expiresIn}
VerifyRoute-->>Client : challenge data
Client->>VerifyRoute : POST /verify/response {pubkey, nonce, signature}
VerifyRoute->>PC : verifyChallenge(pubkey, nonce, signature)
PC->>DB : getVerification(pubkey, nonce)
DB-->>PC : record
PC->>PC : verify Ed25519 signature
PC->>DB : completeVerification(nonce)
PC->>DB : updateLastVerified(pubkey)
PC-->>VerifyRoute : {verified : true, timestamp}
VerifyRoute-->>Client : verification result
```

**Diagram sources**
- [backend/src/services/pkiChallenge.js:17-96](file://backend/src/services/pkiChallenge.js#L17-L96)
- [backend/src/models/queries.js:213-256](file://backend/src/models/queries.js#L213-L256)

**Section sources**
- [backend/src/services/pkiChallenge.js:1-102](file://backend/src/services/pkiChallenge.js#L1-L102)
- [backend/src/models/queries.js:205-256](file://backend/src/models/queries.js#L205-L256)

### Reputation Scoring (GET /reputation/:pubkey)
Computes a 5-factor score (Fee Activity, Success Rate, Registration Age, SAID Trust, Community) and stores it in the database.

```mermaid
flowchart TD
Start(["Compute Score"]) --> LoadAgent["Load agent by pubkey"]
LoadAgent --> Fee["Fetch token mint and fees"]
Fee --> Success["Get action stats"]
Success --> Age["Compute registration age"]
Age --> Said["Fetch SAID trust score"]
Said --> Flags["Count unresolved flags"]
Flags --> Sum["Sum weighted factors"]
Sum --> Label["Assign label (HIGH/MEDIUM/LOW/UNVERIFIED)"]
Label --> Store["Persist score to DB"]
Store --> End(["Return score breakdown"])
```

**Diagram sources**
- [backend/src/services/bagsReputation.js:16-140](file://backend/src/services/bagsReputation.js#L16-L140)
- [backend/src/models/queries.js:187-202](file://backend/src/models/queries.js#L187-L202)
- [backend/src/services/saidBinding.js:61-87](file://backend/src/services/saidBinding.js#L61-L87)

**Section sources**
- [backend/src/services/bagsReputation.js:1-146](file://backend/src/services/bagsReputation.js#L1-L146)
- [backend/src/models/queries.js:1-404](file://backend/src/models/queries.js#L1-L404)
- [backend/src/services/saidBinding.js:1-119](file://backend/src/services/saidBinding.js#L1-L119)

### Badge Generation Pipeline (GET /badge/:pubkey, GET /badge/:pubkey/svg, GET /widget/:pubkey)
- Badge JSON: fetch agent, compute reputation, derive status/tier, cache with TTL
- SVG: render themed SVG badge with status icon and score bar
- Widget: generate HTML page with live refresh and statistics

```mermaid
flowchart TD
Req(["Request Badge"]) --> CacheCheck{"Cache hit?"}
CacheCheck --> |Yes| ReturnCache["Return cached JSON"]
CacheCheck --> |No| LoadAgent["Load agent from DB"]
LoadAgent --> Compute["Compute reputation score"]
Compute --> Status["Derive status and tier"]
Status --> Build["Assemble badge payload"]
Build --> Cache["Cache JSON (TTL)"]
Cache --> Output{"Format?"}
Output --> |JSON| JSONOut["Return JSON"]
Output --> |SVG| SVGOut["Render SVG"]
Output --> |Widget| WidgetOut["Generate HTML"]
```

**Diagram sources**
- [backend/src/services/badgeBuilder.js:17-89](file://backend/src/services/badgeBuilder.js#L17-L89)
- [backend/src/services/badgeBuilder.js:96-213](file://backend/src/services/badgeBuilder.js#L96-L213)
- [backend/src/services/badgeBuilder.js:220-526](file://backend/src/services/badgeBuilder.js#L220-L526)
- [backend/src/models/redis.js:41-71](file://backend/src/models/redis.js#L41-L71)

**Section sources**
- [backend/src/services/badgeBuilder.js:1-548](file://backend/src/services/badgeBuilder.js#L1-L548)
- [backend/src/models/redis.js:1-94](file://backend/src/models/redis.js#L1-L94)
- [backend/src/models/queries.js:1-404](file://backend/src/models/queries.js#L1-L404)

### Conceptual Overview
- Bags Auth: Client obtains a challenge from Bags, signs it with Ed25519, and AgentID verifies the signature locally
- SAID Binding: Agent registration payload includes SAID-compatible fields and Bags binding metadata
- Reputation: Scores are computed from analytics and community signals, stored, and surfaced in badges
- Badge Delivery: JSON for programmatic consumption, SVG for static images, HTML widget for embeds

```mermaid
graph TB
subgraph "Bags Integration"
Init["Init Bags Auth"]
Sign["Client Signs Message"]
Verify["Local Signature Verify"]
end
subgraph "SAID Integration"
Reg["Register with SAID"]
Trust["Fetch SAID Trust Score"]
end
subgraph "Reputation"
Fees["Fee Analytics"]
Actions["Action Stats"]
Age["Registration Age"]
Flags["Flag Count"]
end
subgraph "Badge"
JSON["JSON Badge"]
SVG["SVG Badge"]
Widget["Widget HTML"]
end
Init --> Sign --> Verify --> Reg
Reg --> Trust
Fees --> Score["Compute Score"]
Actions --> Score
Age --> Score
Trust --> Score
Flags --> Score
Score --> JSON
Score --> SVG
Score --> Widget
```

[No sources needed since this diagram shows conceptual workflow, not actual code structure]

## Dependency Analysis
- External dependencies: Express, tweetnacl, bs58, pg, ioredis, axios, helmet, cors, express-rate-limit
- Internal dependencies:
  - Routes depend on services and models
  - Services depend on models and external APIs
  - Models depend on configuration and environment variables
- Coupling: Services encapsulate external integrations; routes remain thin controllers; models abstract persistence

```mermaid
graph LR
Routes["Routes"] --> Services["Services"]
Services --> Models["Models"]
Models --> Config["Config"]
Models --> DB["PostgreSQL"]
Models --> Redis["Redis"]
Services --> Ext["External APIs"]
```

**Diagram sources**
- [backend/server.js:34-41](file://backend/server.js#L34-L41)
- [backend/src/services/bagsAuthVerifier.js:6-9](file://backend/src/services/bagsAuthVerifier.js#L6-L9)
- [backend/src/models/db.js:7-8](file://backend/src/models/db.js#L7-L8)
- [backend/src/models/redis.js:6-7](file://backend/src/models/redis.js#L6-L7)
- [backend/src/config/index.js:6-31](file://backend/src/config/index.js#L6-L31)

**Section sources**
- [backend/package.json:20-36](file://backend/package.json#L20-L36)
- [backend/server.js:25-41](file://backend/server.js#L25-L41)

## Performance Considerations
- Caching: Redis caches badge JSON with configurable TTL to reduce DB and computation load
- Database: Parameterized queries and indexes on status, score, and flags improve query performance
- External calls: SAID and Bags calls are retried with timeouts; failures degrade gracefully
- Rate limiting: Protects endpoints from abuse
- Recommendations: Increase cache TTL for production, monitor Redis and DB latency, and consider connection pooling tuning

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Missing environment variables: The server exits early if required variables are missing; ensure DATABASE_URL, BAGS_API_KEY, and REDIS_URL are configured
- CORS errors: Verify CORS_ORIGIN matches the frontend origin
- Redis unavailability: Redis is a cache; operations continue without it, but badge caching will be disabled
- SAID unreachability: Registration continues without SAID binding; trust score fallback occurs
- Rate limits: Excessive requests are throttled; adjust rate limit settings as needed
- Database connectivity: Check connection string and network; production environments may require SSL configuration

**Section sources**
- [backend/server.js:3-23](file://backend/server.js#L3-L23)
- [backend/src/config/index.js:6-31](file://backend/src/config/index.js#L6-L31)
- [backend/src/models/redis.js:22-30](file://backend/src/models/redis.js#L22-L30)
- [backend/src/services/saidBinding.js:50-53](file://backend/src/services/saidBinding.js#L50-L53)

## Conclusion
AgentID provides a robust trust layer for Bags agents on Solana, integrating authentication, identity binding, reputation scoring, and trust badges. The modular backend architecture, combined with caching and resilient external integrations, enables scalable deployment and easy extension.

## Appendices

### API Quick Reference
- POST /register: Register an agent (Bags auth + SAID binding)
- POST /verify/challenge: Issue PKI challenge
- POST /verify/response: Verify signed challenge
- GET /badge/:pubkey: Trust badge JSON
- GET /badge/:pubkey/svg: SVG badge
- GET /reputation/:pubkey: Full reputation breakdown
- GET /agents: List all agents (filterable)
- GET /discover?capability=...: Agent discovery
- GET /widget/:pubkey: Embeddable trust badge

**Section sources**
- [README.md:56-69](file://README.md#L56-L69)

### Database Schema Overview
- agent_identities: Agent metadata, reputation, flags, and analytics
- agent_verifications: Challenge-response records
- agent_flags: Reports and resolution tracking

**Section sources**
- [DEVELOPER_GUIDE.md:176-233](file://docs/DEVELOPER_GUIDE.md#L176-L233)

### Environment Variables
- Required: DATABASE_URL, BAGS_API_KEY, REDIS_URL
- Optional: PORT, NODE_ENV, SAID_GATEWAY_URL, CORS_ORIGIN, BADGE_CACHE_TTL, CHALLENGE_EXPIRY_SECONDS, AGENTID_BASE_URL

**Section sources**
- [DEVELOPER_GUIDE.md:128-164](file://docs/DEVELOPER_GUIDE.md#L128-L164)