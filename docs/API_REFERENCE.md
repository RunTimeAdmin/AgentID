# AgentID API Reference

**Version:** 1.0.0  
**Base URL:** `https://agentid.provenanceai.network` (configurable via `AGENTID_BASE_URL`)  
**Author:** David Cooper (CCIE #14019)

---

## Authentication Model

AgentID employs an **Ed25519 signature-based authentication model** for all state-modifying operations. This cryptographic approach ensures non-repudiation and eliminates the need for shared secrets or API tokens.

### Challenge-Response Pattern

The authentication flow follows a challenge-response pattern:

1. **Client requests a challenge** by providing their public key
2. **Server issues a challenge** containing a unique nonce and timestamp
3. **Client signs the challenge** using their Ed25519 private key
4. **Server verifies the signature** against the stored public key

### Message Format

Challenge messages follow this exact format:

```
AGENTID-VERIFY:{pubkey}:{nonce}:{timestamp}
```

Where:
- `pubkey` - Base58-encoded Ed25519 public key (32 bytes)
- `nonce` - UUID v4 string for replay protection
- `timestamp` - Unix timestamp in milliseconds

### Signature Creation

```javascript
const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Message to sign
const message = `AGENTID-VERIFY:${pubkey}:${nonce}:${timestamp}`;
const messageBytes = Buffer.from(message, 'utf-8');

// Sign with private key
const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
const signature = bs58.encode(signatureBytes);
```

### Nonce Lifecycle

- **Issuance:** Challenges are issued via `POST /verify/challenge`
- **Expiration:** Default expiry is 300 seconds (5 minutes), configurable via `CHALLENGE_EXPIRY_SECONDS`
- **Single-use:** Each nonce can only be used once; completed challenges are marked in the database
- **Replay protection:** Timestamps must be within 5 minutes of server time (with 1-minute clock skew tolerance)

---

## Rate Limiting

AgentID implements tiered rate limiting to protect API availability while accommodating different use cases.

### Rate Limit Tiers

| Tier | Endpoints | Limit | Window |
|------|-----------|-------|--------|
| **Default** | Read operations (GET requests) | 100 requests | 15 minutes |
| **Auth** | Write operations (POST/PUT), authentication | 20 requests | 15 minutes |

### Rate Limit Headers

All responses include standard rate limit headers:

```http
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1699999999
```

### Exceeded Limit Response

```json
{
  "error": "Too many requests, please try again later.",
  "status": 429
}
```

---

## Error Handling

### Standard Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": "Human-readable error message",
  "pubkey": "optional-public-key-context"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing/invalid parameters, validation failure |
| 401 | Unauthorized | Invalid signature, expired challenge, timestamp too old |
| 404 | Not Found | Agent or challenge not found |
| 409 | Conflict | Agent already registered |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Common Error Codes by Endpoint

- **Invalid Solana Address:** Returns 400 with `"Invalid Solana public key format"`
- **Agent Not Found:** Returns 404 with `"Agent not found"`
- **Invalid Signature:** Returns 401 with `"Invalid signature"`
- **Challenge Expired:** Returns 401 with `"Challenge has expired"`
- **Rate Limited:** Returns 429 with retry information in headers

---

## Reputation Scoring

The AgentID reputation system computes a **BAGS Score (0-100)** using a weighted 5-factor model. This score determines trust labels and badge status.

### 5-Factor Model

| Factor | Weight | Max Points | Description |
|--------|--------|------------|-------------|
| **Fee Activity** | 30% | 30 pts | Trading fee generation on Bags.fm (1 pt per 0.1 SOL) |
| **Success Rate** | 25% | 25 pts | Ratio of successful to total actions |
| **Registration Age** | 20% | 20 pts | Days since registration (1 pt per day, max 20) |
| **SAID Trust Score** | 15% | 15 pts | External trust verification from SAID Identity Gateway |
| **Community Verification** | 10% | 10 pts | Penalty for unresolved flags (10=none, 5=one, 0=two+) |

### Score Calculation

```javascript
// Fee Activity: min(30, floor(totalFeesSOL * 10))
// Success Rate: floor((successful / total) * 25)
// Age: min(20, daysSinceRegistration)
// SAID Trust: floor((saidScore / 100) * 15)
// Community: 10 if 0 flags, 5 if 1 flag, 0 if 2+ flags

const totalScore = feeActivity + successRate + age + saidTrust + community;
```

### Trust Labels

| Score Range | Label | Description |
|-------------|-------|-------------|
| 80-100 | HIGH | Highly trusted agent with strong activity history |
| 60-79 | MEDIUM | Moderately trusted agent with established presence |
| 40-59 | LOW | New or limited-activity agent |
| 0-39 | UNVERIFIED | Insufficient data or flagged concerns |

### Auto-Flagging

Agents with **3 or more unresolved flags** are automatically marked with `status: 'flagged'`, regardless of score.

---

## Endpoints

### Registration & Identity

---

#### POST /register

Register a new agent with Bags authentication and SAID binding.

**Rate Limit:** Auth tier (20 requests / 15 min)

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `pubkey` | string | Yes | 32-88 characters, valid Solana address |
| `name` | string | Yes | 1-255 characters |
| `signature` | string | Yes | Base58-encoded Ed25519 signature |
| `message` | string | Yes | Must contain the nonce |
| `nonce` | string | Yes | Challenge nonce |
| `tokenMint` | string | No | Token mint address for fee tracking |
| `capabilities` | string[] | No | Array of capability strings |
| `creatorX` | string | No | Creator's X/Twitter handle |
| `creatorWallet` | string | No | Creator's wallet address |
| `description` | string | No | Agent description |

**Response Body (201 Created):**
```json
{
  "agent": {
    "pubkey": "AgentPubkey111111111111111111111111111111111",
    "name": "My Trading Agent",
    "description": "Automated trading bot",
    "tokenMint": "TokenMint1111111111111111111111111111111111",
    "capabilities": ["trading", "analytics"],
    "creatorX": "@creator",
    "creatorWallet": "CreatorWallet1111111111111111111111111111111",
    "status": "active",
    "bagsScore": 0,
    "totalActions": 0,
    "successfulActions": 0,
    "failedActions": 0,
    "registeredAt": "2024-01-15T10:30:00.000Z",
    "lastVerified": null
  },
  "said": {
    "registered": true,
    "data": { /* SAID response */ }
  }
}
```

**Error Responses:**
- `400` - Missing/invalid fields, invalid Solana address
- `401` - Invalid signature
- `409` - Agent already registered

**Example Request:**
```bash
curl -X POST https://agentid.provenanceai.network/register \
  -H "Content-Type: application/json" \
  -d '{
    "pubkey": "AgentPubkey111111111111111111111111111111111",
    "name": "My Trading Agent",
    "signature": "Base58Signature...",
    "message": "Auth message containing nonce",
    "nonce": "550e8400-e29b-41d4-a716-446655440000",
    "capabilities": ["trading", "analytics"],
    "creatorX": "@tradingbot"
  }'
```

---

#### PUT /agents/:pubkey/update

Update agent metadata with signature verification.

**Rate Limit:** Auth tier (20 requests / 15 min)

**Request Headers:**
```http
Content-Type: application/json
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `signature` | string | Yes | Base58-encoded Ed25519 signature |
| `timestamp` | number | Yes | Unix timestamp in milliseconds |
| `name` | string | No | 1-255 characters |
| `tokenMint` | string | No | Token mint address |
| `capabilities` | string[] | No | Array of capability strings |
| `creatorX` | string | No | Creator's X/Twitter handle |
| `description` | string | No | Agent description |

**Signature Message Format:**
```
AGENTID-UPDATE:{pubkey}:{timestamp}
```

**Response Body (200 OK):**
```json
{
  "agent": {
    "pubkey": "AgentPubkey111111111111111111111111111111111",
    "name": "Updated Agent Name",
    "description": "Updated description",
    "tokenMint": "TokenMint1111111111111111111111111111111111",
    "capabilities": ["trading", "analytics", "reporting"],
    "creatorX": "@newhandle",
    "status": "active",
    "bagsScore": 45,
    "totalActions": 10,
    "successfulActions": 9,
    "failedActions": 1,
    "registeredAt": "2024-01-15T10:30:00.000Z",
    "lastVerified": "2024-01-20T14:22:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid fields, no valid fields to update, timestamp too old/future
- `401` - Invalid signature, timestamp outside 5-minute window
- `404` - Agent not found

**Example Request:**
```bash
curl -X PUT https://agentid.provenanceai.network/agents/AgentPubkey111111111111111111111111111111111/update \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "Base58Signature...",
    "timestamp": 1705753200000,
    "name": "Updated Agent Name",
    "capabilities": ["trading", "analytics", "reporting"]
  }'
```

---

### Verification (PKI Challenge-Response)

---

#### POST /verify/challenge

Issue a PKI challenge for agent verification.

**Rate Limit:** Auth tier (20 requests / 15 min)

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `pubkey` | string | Yes | Valid Solana address |

**Response Body (200 OK):**
```json
{
  "nonce": "550e8400-e29b-41d4-a716-446655440000",
  "challenge": "8n3kQm9XvB2pL5rT...", 
  "expiresIn": 300
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | string | UUID v4 challenge identifier |
| `challenge` | string | Base58-encoded challenge message |
| `expiresIn` | number | Seconds until expiration |

**Error Responses:**
- `400` - Invalid pubkey format
- `404` - Agent not found

**Example Request:**
```bash
curl -X POST https://agentid.provenanceai.network/verify/challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey": "AgentPubkey111111111111111111111111111111111"}'
```

---

#### POST /verify/response

Verify a signed challenge response.

**Rate Limit:** Auth tier (20 requests / 15 min)

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pubkey` | string | Yes | Agent's public key |
| `nonce` | string | Yes | Challenge nonce from `/verify/challenge` |
| `signature` | string | Yes | Base58-encoded Ed25519 signature |

**Response Body (200 OK):**
```json
{
  "verified": true,
  "pubkey": "AgentPubkey111111111111111111111111111111111",
  "timestamp": 1705753200000
}
```

**Error Responses:**
- `400` - Missing/invalid fields
- `401` - Challenge expired or invalid signature
- `404` - Challenge not found or already completed

**Example Request:**
```bash
curl -X POST https://agentid.provenanceai.network/verify/response \
  -H "Content-Type: application/json" \
  -d '{
    "pubkey": "AgentPubkey111111111111111111111111111111111",
    "nonce": "550e8400-e29b-41d4-a716-446655440000",
    "signature": "Base58Signature..."
  }'
```

---

### Trust & Reputation

---

#### GET /badge/:pubkey

Retrieve trust badge data as JSON.

**Rate Limit:** Default tier (100 requests / 15 min)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Response Body (200 OK):**
```json
{
  "pubkey": "AgentPubkey111111111111111111111111111111111",
  "name": "My Trading Agent",
  "status": "verified",
  "badge": "✅",
  "label": "VERIFIED AGENT",
  "score": 75,
  "bags_score": 75,
  "saidTrustScore": 85,
  "saidLabel": "HIGH",
  "registeredAt": "2024-01-15T10:30:00.000Z",
  "lastVerified": "2024-01-20T14:22:00.000Z",
  "totalActions": 150,
  "successRate": 0.94,
  "capabilities": ["trading", "analytics"],
  "tokenMint": "TokenMint1111111111111111111111111111111111",
  "widgetUrl": "https://agentid.provenanceai.network/widget/AgentPubkey111111111111111111111111111111111"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `verified`, `unverified`, or `flagged` |
| `badge` | string | Emoji indicator (✅, ⚠️, 🔴) |
| `label` | string | Human-readable status label |
| `score` | number | BAGS reputation score (0-100) |
| `successRate` | number | Ratio of successful actions (0.0-1.0) |
| `widgetUrl` | string | URL for embedding the widget |

**Error Responses:**
- `404` - Agent not found

**Example Request:**
```bash
curl https://agentid.provenanceai.network/badge/AgentPubkey111111111111111111111111111111111
```

---

#### GET /badge/:pubkey/svg

Retrieve trust badge as an SVG image.

**Rate Limit:** Default tier (100 requests / 15 min)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Response:**
- **Content-Type:** `image/svg+xml`
- **Body:** SVG markup (320x80px badge)

**SVG Colors by Status:**
- **Verified:** Green theme (#22c55e)
- **Unverified:** Amber theme (#f59e0b)
- **Flagged:** Red theme (#ef4444)

**Error Responses:**
- `404` - Agent not found (returns JSON error)

**Example Request:**
```bash
curl https://agentid.provenanceai.network/badge/AgentPubkey111111111111111111111111111111111/svg
```

**Markdown Usage:**
```markdown
![Agent Trust Badge](https://agentid.provenanceai.network/badge/AgentPubkey111111111111111111111111111111111/svg)
```

---

#### GET /reputation/:pubkey

Retrieve full reputation breakdown with 5-factor analysis.

**Rate Limit:** Default tier (100 requests / 15 min)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Response Body (200 OK):**
```json
{
  "pubkey": "AgentPubkey111111111111111111111111111111111",
  "score": 75,
  "label": "MEDIUM",
  "breakdown": {
    "feeActivity": {
      "score": 25,
      "max": 30
    },
    "successRate": {
      "score": 23,
      "max": 25
    },
    "age": {
      "score": 15,
      "max": 20
    },
    "saidTrust": {
      "score": 12,
      "max": 15
    },
    "community": {
      "score": 10,
      "max": 10
    }
  }
}
```

**Error Responses:**
- `404` - Agent not found

**Example Request:**
```bash
curl https://agentid.provenanceai.network/reputation/AgentPubkey111111111111111111111111111111111
```

---

### Agent Registry & Discovery

---

#### GET /agents

List registered agents with optional filters.

**Rate Limit:** Default tier (100 requests / 15 min)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status (`active`, `flagged`, etc.) |
| `capability` | string | - | Filter by capability |
| `limit` | number | 50 | Results per page (max 100) |
| `offset` | number | 0 | Pagination offset |

**Response Body (200 OK):**
```json
{
  "agents": [
    {
      "pubkey": "AgentPubkey111111111111111111111111111111111",
      "name": "My Trading Agent",
      "description": "Automated trading bot",
      "tokenMint": "TokenMint1111111111111111111111111111111111",
      "capabilities": ["trading", "analytics"],
      "creatorX": "@creator",
      "creatorWallet": "CreatorWallet1111111111111111111111111111111",
      "status": "active",
      "bagsScore": 75,
      "totalActions": 150,
      "successfulActions": 141,
      "failedActions": 9,
      "registeredAt": "2024-01-15T10:30:00.000Z",
      "lastVerified": "2024-01-20T14:22:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

**Example Request:**
```bash
# List all agents
curl https://agentid.provenanceai.network/agents

# Filter by capability with pagination
curl "https://agentid.provenanceai.network/agents?capability=trading&limit=10&offset=0"
```

---

#### GET /agents/:pubkey

Get detailed information for a single agent including reputation.

**Rate Limit:** Default tier (100 requests / 15 min)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Response Body (200 OK):**
```json
{
  "agent": {
    "pubkey": "AgentPubkey111111111111111111111111111111111",
    "name": "My Trading Agent",
    "description": "Automated trading bot",
    "tokenMint": "TokenMint1111111111111111111111111111111111",
    "capabilities": ["trading", "analytics"],
    "creatorX": "@creator",
    "creatorWallet": "CreatorWallet1111111111111111111111111111111",
    "status": "active",
    "bagsScore": 75,
    "totalActions": 150,
    "successfulActions": 141,
    "failedActions": 9,
    "registeredAt": "2024-01-15T10:30:00.000Z",
    "lastVerified": "2024-01-20T14:22:00.000Z"
  },
  "reputation": {
    "score": 75,
    "label": "MEDIUM",
    "breakdown": {
      "feeActivity": { "score": 25, "max": 30 },
      "successRate": { "score": 23, "max": 25 },
      "age": { "score": 15, "max": 20 },
      "saidTrust": { "score": 12, "max": 15 },
      "community": { "score": 10, "max": 10 }
    }
  }
}
```

**Error Responses:**
- `400` - Invalid Solana address format
- `404` - Agent not found

**Example Request:**
```bash
curl https://agentid.provenanceai.network/agents/AgentPubkey111111111111111111111111111111111
```

---

#### GET /discover

A2A (Agent-to-Agent) discovery - find agents by capability.

**Rate Limit:** Default tier (100 requests / 15 min)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `capability` | string | Yes | Capability to search for |

**Response Body (200 OK):**
```json
{
  "agents": [
    {
      "pubkey": "AgentPubkey111111111111111111111111111111111",
      "name": "My Trading Agent",
      "description": "Automated trading bot",
      "tokenMint": "TokenMint1111111111111111111111111111111111",
      "capabilities": ["trading", "analytics"],
      "creatorX": "@creator",
      "status": "active",
      "bagsScore": 75,
      "totalActions": 150,
      "registeredAt": "2024-01-15T10:30:00.000Z",
      "lastVerified": "2024-01-20T14:22:00.000Z"
    }
  ],
  "capability": "trading",
  "count": 1
}
```

**Error Responses:**
- `400` - Missing capability parameter

**Example Request:**
```bash
curl "https://agentid.provenanceai.network/discover?capability=analytics"
```

---

### Attestation & Flagging

---

#### POST /agents/:pubkey/attest

Record a successful or failed action for an agent.

**Rate Limit:** Default tier (100 requests / 15 min)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | Yes | Whether the action was successful |
| `action` | string | No | Action identifier/description |

**Response Body (200 OK):**
```json
{
  "pubkey": "AgentPubkey111111111111111111111111111111111",
  "success": true,
  "action": "execute_trade",
  "totalActions": 151,
  "successfulActions": 142,
  "failedActions": 9,
  "bagsScore": 76
}
```

**Error Responses:**
- `400` - Invalid success field (must be boolean)
- `404` - Agent not found

**Example Request:**
```bash
curl -X POST https://agentid.provenanceai.network/agents/AgentPubkey111111111111111111111111111111111/attest \
  -H "Content-Type: application/json" \
  -d '{
    "success": true,
    "action": "execute_trade"
  }'
```

---

#### POST /agents/:pubkey/flag

Flag suspicious behavior for an agent.

**Rate Limit:** Default tier (100 requests / 15 min)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reporterPubkey` | string | Yes | Public key of the reporter |
| `reason` | string | Yes | Reason for flagging |
| `evidence` | string | No | Supporting evidence/notes |

**Response Body (201 Created):**
```json
{
  "flag": {
    "id": 1,
    "pubkey": "AgentPubkey111111111111111111111111111111111",
    "reporter_pubkey": "ReporterPubkey111111111111111111111111111111",
    "reason": "Suspicious trading pattern",
    "evidence": "Multiple failed transactions",
    "status": "pending",
    "created_at": "2024-01-20T15:30:00.000Z"
  },
  "unresolved_flags": 1,
  "auto_flagged": false
}
```

**Auto-Flagging:** When `unresolved_flags >= 3`, the agent status is automatically set to `flagged`.

**Error Responses:**
- `400` - Missing/invalid fields
- `404` - Agent not found

**Example Request:**
```bash
curl -X POST https://agentid.provenanceai.network/agents/AgentPubkey111111111111111111111111111111111/flag \
  -H "Content-Type: application/json" \
  -d '{
    "reporterPubkey": "ReporterPubkey111111111111111111111111111111",
    "reason": "Suspicious trading pattern",
    "evidence": "Multiple failed transactions in short timeframe"
  }'
```

---

#### GET /agents/:pubkey/attestations

Retrieve action statistics for an agent.

**Rate Limit:** Default tier (100 requests / 15 min)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Response Body (200 OK):**
```json
{
  "pubkey": "AgentPubkey111111111111111111111111111111111",
  "totalActions": 151,
  "successfulActions": 142,
  "failedActions": 9,
  "bagsScore": 76
}
```

**Error Responses:**
- `404` - Agent not found

**Example Request:**
```bash
curl https://agentid.provenanceai.network/agents/AgentPubkey111111111111111111111111111111111/attestations
```

---

#### GET /agents/:pubkey/flags

Retrieve all flags for an agent.

**Rate Limit:** Default tier (100 requests / 15 min)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Response Body (200 OK):**
```json
{
  "pubkey": "AgentPubkey111111111111111111111111111111111",
  "flags": [
    {
      "id": 1,
      "pubkey": "AgentPubkey111111111111111111111111111111111",
      "reporter_pubkey": "ReporterPubkey111111111111111111111111111111",
      "reason": "Suspicious trading pattern",
      "evidence": "Multiple failed transactions",
      "status": "pending",
      "created_at": "2024-01-20T15:30:00.000Z"
    }
  ],
  "count": 1
}
```

**Error Responses:**
- `404` - Agent not found

**Example Request:**
```bash
curl https://agentid.provenanceai.network/agents/AgentPubkey111111111111111111111111111111111/flags
```

---

### Widget

---

#### GET /widget/:pubkey

Retrieve an embeddable HTML widget for an agent.

**Rate Limit:** Default tier (100 requests / 15 min)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pubkey` | string | Agent's public key |

**Response:**
- **Content-Type:** `text/html`
- **Body:** Complete HTML page with styled widget

The widget includes:
- Status indicator with visual badge
- Trust score with progress bar
- Action statistics (total, success rate)
- Registration and verification dates
- Capability tags
- Auto-refresh every 60 seconds

**Error Responses:**
- `404` - Agent not found (returns styled error HTML page)

**Example Request:**
```bash
curl https://agentid.provenanceai.network/widget/AgentPubkey111111111111111111111111111111111
```

**iframe Embed:**
```html
<iframe 
  src="https://agentid.provenanceai.network/widget/AgentPubkey111111111111111111111111111111111"
  width="400"
  height="300"
  frameborder="0"
></iframe>
```

---

## Configuration Reference

Environment variables for API configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3002 | Server port |
| `NODE_ENV` | development | Environment mode |
| `AGENTID_BASE_URL` | http://localhost:3002 | Base URL for widget/badge links |
| `DATABASE_URL` | postgresql://user:password@localhost:5432/agentid | PostgreSQL connection |
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `CORS_ORIGIN` | http://localhost:5173 | Allowed CORS origin |
| `BADGE_CACHE_TTL` | 60 | Badge cache TTL in seconds |
| `CHALLENGE_EXPIRY_SECONDS` | 300 | Challenge expiration time |
| `BAGS_API_KEY` | - | API key for Bags.fm integration |
| `SAID_GATEWAY_URL` | https://said-identity-gateway.up.railway.app | SAID gateway endpoint |

---

*Document Version: 1.0.0*  
*Last Updated: April 2026*
