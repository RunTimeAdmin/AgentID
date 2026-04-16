# AgentID — The Bags-Native Trust Layer for AI Agents

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)

## What it is

AgentID is the trust verification layer that sits between Bags agents and the humans/apps that interact with them. It wraps Bags' existing Ed25519 agent auth flow, binds agent identities to the Solana Agent Registry (SAID Protocol), adds Bags-specific reputation scoring, and surfaces a human-readable trust badge.

## Architecture

```
Bags Agent Auth  ──┐
                   ├──▶  AgentID Registry Service  ──▶  Trust Badge / Widget
SAID Gateway    ──┘      (Node.js / Express / PG)        (JSON / SVG / iframe)
                         + 5-factor Reputation Score
```

## Tech Stack

- **Backend:** Node.js 20, Express, PostgreSQL, Redis
- **Frontend:** React 18, Vite, Tailwind CSS
- **Cryptography:** tweetnacl (Ed25519), bs58
- **External APIs:** Bags API, SAID Identity Gateway

## Documentation

- [API Reference](docs/API_REFERENCE.md) — Full API documentation
- [Widget Guide](docs/WIDGET_GUIDE.md) — Widget integration guide
- [Developer Guide](docs/DEVELOPER_GUIDE.md) — Developer setup and architecture

## Quick Start

```bash
# Clone
git clone https://github.com/RunTimeAdmin/AgentID.git
cd AgentID

# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# Backend
cd backend
cp .env.example .env  # Configure your database, Redis, API keys
npm install
npm run migrate       # Create database tables
npm start             # Starts on port 3002

# Frontend (separate terminal)
cd frontend
npm install
npm run dev           # Starts on port 5173
```

## API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | Register an agent (Bags auth + SAID binding) |
| POST | /verify/challenge | Issue PKI challenge |
| POST | /verify/response | Verify signed challenge |
| GET | /badge/:pubkey | Get trust badge JSON |
| GET | /badge/:pubkey/svg | Get SVG badge |
| GET | /reputation/:pubkey | Full reputation breakdown |
| GET | /agents | List all agents (filterable) |
| GET | /discover?capability=... | A2A agent discovery |
| GET | /widget/:pubkey | Embeddable trust badge |

## Widget Embed

```html
<iframe 
  src="https://your-domain.io/widget/AGENT_PUBKEY"
  width="320" height="80" frameborder="0">
</iframe>
```

## Reputation Scoring

The 5-factor reputation model (0-100 points):

| Factor | Weight | Description |
|--------|--------|-------------|
| Fee Activity | 30 pts | Based on fee claims in SOL |
| Success Rate | 25 pts | Successful vs failed actions |
| Registration Age | 20 pts | +1 per day, capped at 20 |
| SAID Trust | 15 pts | Inherits SAID protocol trust score |
| Community | 10 pts | No flags = 10, 1 flag = 5, 2+ = 0 |

## Environment Variables

See `backend/.env.example` for all required environment variables.

## License

MIT

## Built by

David Cooper (CCIE #14019) — Built for the Bags Ecosystem Hackathon

<!-- GitHub Settings: Description: "Bags-native trust verification layer for AI agents", Topics: bags, solana, ai-agents, trust, identity, ed25519, hackathon -->
