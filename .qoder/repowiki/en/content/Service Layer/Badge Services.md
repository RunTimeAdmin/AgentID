# Badge Services

<cite>
**Referenced Files in This Document**
- [backend/src/services/badgeBuilder.js](file://backend/src/services/badgeBuilder.js)
- [backend/src/routes/badge.js](file://backend/src/routes/badge.js)
- [backend/src/routes/widget.js](file://backend/src/routes/widget.js)
- [backend/src/models/redis.js](file://backend/src/models/redis.js)
- [backend/src/config/index.js](file://backend/src/config/index.js)
- [backend/src/utils/transform.js](file://backend/src/utils/transform.js)
- [backend/server.js](file://backend/server.js)
- [frontend/src/components/TrustBadge.jsx](file://frontend/src/components/TrustBadge.jsx)
- [frontend/src/widget/Widget.jsx](file://frontend/src/widget/Widget.jsx)
- [frontend/src/widget/widget-entry.jsx](file://frontend/src/widget/widget-entry.jsx)
- [frontend/src/widget/widget.css](file://frontend/src/widget/widget.css)
- [agentid_build_plan.md](file://agentid_build_plan.md)
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
This document explains the AgentID badge services that power trust badges, SVG generation, and widget rendering. It covers the badgeBuilder service, the rendering pipeline, caching strategies, configuration options, and integration with the widget system. It also addresses SVG optimization, accessibility, and responsive design patterns.

## Project Structure
The badge services span backend and frontend:
- Backend exposes badge JSON, SVG, and widget endpoints and caches results.
- Frontend provides a React TrustBadge component and a standalone widget for embedding.

```mermaid
graph TB
subgraph "Backend"
S["Server<br/>server.js"]
R1["Routes<br/>routes/badge.js"]
R2["Routes<br/>routes/widget.js"]
B["Badge Builder<br/>services/badgeBuilder.js"]
C["Config<br/>config/index.js"]
D["Redis Cache<br/>models/redis.js"]
T["Transform Utils<br/>utils/transform.js"]
end
subgraph "Frontend"
F1["TrustBadge Component<br/>frontend/src/components/TrustBadge.jsx"]
F2["Widget App<br/>frontend/src/widget/Widget.jsx"]
F3["Widget Entry<br/>frontend/src/widget/widget-entry.jsx"]
F4["Widget Styles<br/>frontend/src/widget/widget.css"]
end
S --> R1
S --> R2
R1 --> B
R2 --> B
B --> D
B --> C
B --> T
F2 --> F3
F2 --> F4
F1 --> F2
```

**Diagram sources**
- [backend/server.js:1-91](file://backend/server.js#L1-L91)
- [backend/src/routes/badge.js:1-58](file://backend/src/routes/badge.js#L1-L58)
- [backend/src/routes/widget.js:1-89](file://backend/src/routes/widget.js#L1-L89)
- [backend/src/services/badgeBuilder.js:1-497](file://backend/src/services/badgeBuilder.js#L1-L497)
- [backend/src/models/redis.js:1-94](file://backend/src/models/redis.js#L1-L94)
- [backend/src/config/index.js:1-31](file://backend/src/config/index.js#L1-L31)
- [backend/src/utils/transform.js:1-103](file://backend/src/utils/transform.js#L1-L103)
- [frontend/src/components/TrustBadge.jsx:1-145](file://frontend/src/components/TrustBadge.jsx#L1-L145)
- [frontend/src/widget/Widget.jsx:1-218](file://frontend/src/widget/Widget.jsx#L1-L218)
- [frontend/src/widget/widget-entry.jsx:1-11](file://frontend/src/widget/widget-entry.jsx#L1-L11)
- [frontend/src/widget/widget.css:1-70](file://frontend/src/widget/widget.css#L1-L70)

**Section sources**
- [backend/server.js:1-91](file://backend/server.js#L1-L91)
- [agentid_build_plan.md:258-303](file://agentid_build_plan.md#L258-L303)

## Core Components
- Badge Builder service: Computes reputation, constructs badge JSON, generates SVG, and produces HTML widget.
- Routes: Expose endpoints for badge JSON, SVG, and widget HTML.
- Redis cache: Stores badge JSON with TTL to reduce DB and computation overhead.
- Frontend TrustBadge: Renders a compact badge UI for the main app.
- Frontend Widget: Standalone embeddable widget with auto-refresh.

**Section sources**
- [backend/src/services/badgeBuilder.js:17-83](file://backend/src/services/badgeBuilder.js#L17-L83)
- [backend/src/routes/badge.js:16-32](file://backend/src/routes/badge.js#L16-L32)
- [backend/src/routes/widget.js:18-86](file://backend/src/routes/widget.js#L18-L86)
- [backend/src/models/redis.js:41-71](file://backend/src/models/redis.js#L41-L71)
- [frontend/src/components/TrustBadge.jsx:42-135](file://frontend/src/components/TrustBadge.jsx#L42-L135)
- [frontend/src/widget/Widget.jsx:61-215](file://frontend/src/widget/Widget.jsx#L61-L215)

## Architecture Overview
The badge pipeline:
- Request arrives at a route endpoint.
- Route delegates to badgeBuilder service.
- badgeBuilder retrieves agent data, computes reputation, and constructs badge payload.
- Results are cached in Redis with TTL.
- For SVG and widget, badgeBuilder generates markup and returns it to clients.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Route as "Badge Routes"
participant Builder as "Badge Builder"
participant Cache as "Redis Cache"
participant DB as "Queries"
Client->>Route : GET /badge/ : pubkey
Route->>Builder : getBadgeJSON(pubkey)
Builder->>Cache : getCache("badge : <pubkey>")
alt Cache hit
Cache-->>Builder : JSON data
else Cache miss
Builder->>DB : getAgent(pubkey)
DB-->>Builder : Agent data
Builder->>DB : getAgentActions(pubkey)
DB-->>Builder : Actions stats
Builder->>Cache : setCache("badge : <pubkey>", JSON, TTL)
end
Builder-->>Route : Badge JSON
Route-->>Client : 200 JSON
```

**Diagram sources**
- [backend/src/routes/badge.js:16-32](file://backend/src/routes/badge.js#L16-L32)
- [backend/src/services/badgeBuilder.js:17-83](file://backend/src/services/badgeBuilder.js#L17-L83)
- [backend/src/models/redis.js:41-71](file://backend/src/models/redis.js#L41-L71)

## Detailed Component Analysis

### Badge Builder Service
Responsibilities:
- Compute reputation and derive status.
- Build badge JSON with metadata and widget URL.
- Generate SVG with dynamic colors based on status.
- Produce HTML widget with theme-aware styling and auto-refresh.

Key behaviors:
- Status derivation: verified, flagged, or unverified based on agent status and reputation threshold.
- Color schemes: verified uses green tones, flagged uses red, unverified uses amber.
- SVG generation: uses inline gradients and status icons; score bar reflects normalized score.
- Widget HTML: themed CSS with glow effects, animated elements, and live refresh.

```mermaid
flowchart TD
Start(["getBadgeJSON(pubkey)"]) --> CacheCheck["Check Redis cache"]
CacheCheck --> |Hit| ReturnCached["Return cached JSON"]
CacheCheck --> |Miss| LoadAgent["Load agent from DB"]
LoadAgent --> |Not found| ThrowNotFound["Throw 404 error"]
LoadAgent --> ComputeRep["Compute reputation score"]
ComputeRep --> Stats["Fetch action stats"]
Stats --> DeriveStatus["Derive status and label"]
DeriveStatus --> BuildJSON["Build badge JSON"]
BuildJSON --> CacheSet["Set cache with TTL"]
CacheSet --> ReturnJSON["Return JSON"]
```

**Diagram sources**
- [backend/src/services/badgeBuilder.js:17-83](file://backend/src/services/badgeBuilder.js#L17-L83)
- [backend/src/models/redis.js:41-71](file://backend/src/models/redis.js#L41-L71)

**Section sources**
- [backend/src/services/badgeBuilder.js:17-83](file://backend/src/services/badgeBuilder.js#L17-L83)
- [backend/src/services/badgeBuilder.js:90-162](file://backend/src/services/badgeBuilder.js#L90-L162)
- [backend/src/services/badgeBuilder.js:169-475](file://backend/src/services/badgeBuilder.js#L169-L475)

### Routes: Badge and Widget
- Badge routes:
  - GET /badge/:pubkey returns badge JSON.
  - GET /badge/:pubkey/svg returns SVG with appropriate content-type header.
- Widget route:
  - GET /widget/:pubkey returns HTML widget page.
  - Validates agent existence and returns a simple error page if not found.

```mermaid
sequenceDiagram
participant Client as "Client"
participant BadgeRoute as "GET /badge/ : pubkey"
participant SVGRoute as "GET /badge/ : pubkey/svg"
participant WidgetRoute as "GET /widget/ : pubkey"
participant Builder as "Badge Builder"
Client->>BadgeRoute : Request JSON
BadgeRoute->>Builder : getBadgeJSON(pubkey)
Builder-->>BadgeRoute : JSON
BadgeRoute-->>Client : 200 JSON
Client->>SVGRoute : Request SVG
SVGRoute->>Builder : getBadgeSVG(pubkey)
Builder-->>SVGRoute : SVG string
SVGRoute-->>Client : 200 image/svg+xml
Client->>WidgetRoute : Request HTML widget
WidgetRoute->>Builder : getWidgetHTML(pubkey)
Builder-->>WidgetRoute : HTML string
WidgetRoute-->>Client : 200 text/html
```

**Diagram sources**
- [backend/src/routes/badge.js:16-55](file://backend/src/routes/badge.js#L16-L55)
- [backend/src/routes/widget.js:18-86](file://backend/src/routes/widget.js#L18-L86)
- [backend/src/services/badgeBuilder.js:90-162](file://backend/src/services/badgeBuilder.js#L90-L162)
- [backend/src/services/badgeBuilder.js:169-475](file://backend/src/services/badgeBuilder.js#L169-L475)

**Section sources**
- [backend/src/routes/badge.js:16-55](file://backend/src/routes/badge.js#L16-L55)
- [backend/src/routes/widget.js:18-86](file://backend/src/routes/widget.js#L18-L86)

### Frontend TrustBadge Component
- Props: status, name, score, registeredAt, totalActions, className.
- Status-dependent styling: verified (green), flagged (red), unverified (amber).
- Renders status icon, label, agent name, and meta info (registered date, total actions).
- Uses CSS variables and Tailwind classes for theming.

**Section sources**
- [frontend/src/components/TrustBadge.jsx:42-135](file://frontend/src/components/TrustBadge.jsx#L42-L135)

### Frontend Widget Application
- Standalone React app embedded in an iframe.
- Fetches badge JSON from the backend and renders a rich widget with:
  - Status icon and label.
  - Trust score with animated progress bar.
  - Stats grid (total actions, success rate, registered date, last verified).
  - Capability tags.
  - Footer with branding and live indicator.
- Auto-refreshes every 60 seconds.

```mermaid
sequenceDiagram
participant Iframe as "Iframe"
participant Widget as "Widget.jsx"
participant API as "Badge API"
participant Builder as "Badge Builder"
Iframe->>Widget : Mount
Widget->>API : GET /badge/ : pubkey
API->>Builder : getBadgeJSON(pubkey)
Builder-->>API : JSON
API-->>Widget : JSON
Widget-->>Iframe : Render widget
Note over Widget : Auto-refresh every 60s
```

**Diagram sources**
- [frontend/src/widget/Widget.jsx:73-102](file://frontend/src/widget/Widget.jsx#L73-L102)
- [backend/src/services/badgeBuilder.js:17-83](file://backend/src/services/badgeBuilder.js#L17-L83)

**Section sources**
- [frontend/src/widget/Widget.jsx:61-215](file://frontend/src/widget/Widget.jsx#L61-L215)
- [frontend/src/widget/widget-entry.jsx:1-11](file://frontend/src/widget/widget-entry.jsx#L1-L11)
- [frontend/src/widget/widget.css:1-70](file://frontend/src/widget/widget.css#L1-L70)

## Dependency Analysis
- badgeBuilder depends on:
  - queries (agent and actions retrieval).
  - reputation service (computeBagsScore).
  - redis cache (getCache/setCache).
  - config (base URL and cache TTL).
  - transform utilities (escapeHtml/escapeXml).
- Routes depend on badgeBuilder and apply rate limiting.
- Frontend widget depends on axios and environment-provided base URL.

```mermaid
graph LR
BB["badgeBuilder.js"] --> CFG["config/index.js"]
BB --> REDIS["models/redis.js"]
BB --> TRANS["utils/transform.js"]
BR["routes/badge.js"] --> BB
WR["routes/widget.js"] --> BB
WIDGET["frontend/widget/Widget.jsx"] --> API["Axios"]
```

**Diagram sources**
- [backend/src/services/badgeBuilder.js:6-10](file://backend/src/services/badgeBuilder.js#L6-L10)
- [backend/src/routes/badge.js:7-8](file://backend/src/routes/badge.js#L7-L8)
- [backend/src/routes/widget.js:7-10](file://backend/src/routes/widget.js#L7-L10)
- [frontend/src/widget/Widget.jsx:7-14](file://frontend/src/widget/Widget.jsx#L7-L14)

**Section sources**
- [backend/src/services/badgeBuilder.js:6-10](file://backend/src/services/badgeBuilder.js#L6-L10)
- [backend/src/routes/badge.js:7-8](file://backend/src/routes/badge.js#L7-L8)
- [backend/src/routes/widget.js:7-10](file://backend/src/routes/widget.js#L7-L10)
- [frontend/src/widget/Widget.jsx:7-14](file://frontend/src/widget/Widget.jsx#L7-L14)

## Performance Considerations
- Caching:
  - Badge JSON is cached with a configurable TTL to minimize repeated DB queries and reputation computations.
  - Redis is configured with retry strategy and offline queue to improve resilience.
- Rate limiting:
  - Routes apply default rate limiter to protect backend resources.
- Rendering:
  - SVG is generated server-side to offload client rendering.
  - Widget uses lightweight React and minimal DOM updates.
- Auto-refresh:
  - Widget refreshes every 60 seconds to keep data fresh without manual reloads.

**Section sources**
- [backend/src/models/redis.js:10-20](file://backend/src/models/redis.js#L10-L20)
- [backend/src/models/redis.js:41-71](file://backend/src/models/redis.js#L41-L71)
- [backend/src/config/index.js:26](file://backend/src/config/index.js#L26)
- [backend/src/routes/badge.js:8](file://backend/src/routes/badge.js#L8)
- [backend/src/routes/widget.js:9](file://backend/src/routes/widget.js#L9)
- [frontend/src/widget/Widget.jsx:99-102](file://frontend/src/widget/Widget.jsx#L99-L102)

## Troubleshooting Guide
Common issues and resolutions:
- Agent not found:
  - Badge JSON and SVG routes return 404 with structured error when agent does not exist.
  - Widget route returns a simple HTML error page with the pubkey.
- Redis connectivity:
  - Redis client logs errors but does not crash; cache operations fall back gracefully.
- XSS prevention:
  - HTML and XML escaping helpers are used to sanitize dynamic content in badgeBuilder and widget routes.
- Widget loading:
  - Widget displays a skeleton while loading and an error state if the API fails.

**Section sources**
- [backend/src/routes/badge.js:24-31](file://backend/src/routes/badge.js#L24-L31)
- [backend/src/routes/badge.js:47-52](file://backend/src/routes/badge.js#L47-L52)
- [backend/src/routes/widget.js:24-77](file://backend/src/routes/widget.js#L24-L77)
- [backend/src/models/redis.js:27-30](file://backend/src/models/redis.js#L27-L30)
- [backend/src/utils/transform.js:72-80](file://backend/src/utils/transform.js#L72-L80)
- [backend/src/services/badgeBuilder.js:482-490](file://backend/src/services/badgeBuilder.js#L482-L490)
- [frontend/src/widget/Widget.jsx:115-145](file://frontend/src/widget/Widget.jsx#L115-L145)

## Conclusion
The badge services provide a robust, cache-backed pipeline for generating trust badges in JSON, SVG, and HTML widget formats. They integrate seamlessly with the frontend TrustBadge component and the standalone widget, offering consistent theming, responsive design, and performance optimizations through caching and rate limiting.

## Appendices

### Configuration Options
- Cache TTL: Controls how long badge JSON remains cached.
- Base URL: Used to construct widget URLs.
- Redis URL: Connection string for caching.
- CORS Origin: Controls which origins can access the API.

**Section sources**
- [backend/src/config/index.js:6-28](file://backend/src/config/index.js#L6-L28)

### Badge Generation Workflows
- JSON workflow:
  - Route GET /badge/:pubkey → badgeBuilder.getBadgeJSON → cache miss → DB queries → cache set → return JSON.
- SVG workflow:
  - Route GET /badge/:pubkey/svg → badgeBuilder.getBadgeSVG → dynamic colors and SVG assembly → return SVG.
- Widget workflow:
  - Route GET /widget/:pubkey → badgeBuilder.getWidgetHTML → themed HTML with live refresh → return HTML.

**Section sources**
- [backend/src/routes/badge.js:16-55](file://backend/src/routes/badge.js#L16-L55)
- [backend/src/routes/widget.js:18-86](file://backend/src/routes/widget.js#L18-L86)
- [backend/src/services/badgeBuilder.js:90-162](file://backend/src/services/badgeBuilder.js#L90-L162)
- [backend/src/services/badgeBuilder.js:169-475](file://backend/src/services/badgeBuilder.js#L169-L475)

### Customization and Branding
- Status-based theming:
  - Verified: green accents and background.
  - Flagged: red accents and background.
  - Unverified: amber accents and background.
- SVG customization:
  - Colors derived from status; score bar width scales with score.
- Widget customization:
  - Theme colors, glow effects, and typography controlled via CSS variables and inline styles.

**Section sources**
- [backend/src/services/badgeBuilder.js:94-108](file://backend/src/services/badgeBuilder.js#L94-L108)
- [backend/src/services/badgeBuilder.js:173-187](file://backend/src/services/badgeBuilder.js#L173-L187)
- [frontend/src/components/TrustBadge.jsx:3-40](file://frontend/src/components/TrustBadge.jsx#L3-L40)
- [frontend/src/widget/widget.css:3-25](file://frontend/src/widget/widget.css#L3-L25)

### Accessibility and Responsive Design
- Accessibility:
  - SVG uses semantic text elements and appropriate contrast.
  - Widget uses readable fonts and sufficient color contrast.
- Responsive:
  - Widget adapts to small screen sizes with flexible layout and reduced font sizes.
  - TrustBadge component truncates long names and uses responsive spacing.

**Section sources**
- [backend/src/services/badgeBuilder.js:120-156](file://backend/src/services/badgeBuilder.js#L120-L156)
- [frontend/src/components/TrustBadge.jsx:84-89](file://frontend/src/components/TrustBadge.jsx#L84-L89)
- [frontend/src/widget/Widget.jsx:150-214](file://frontend/src/widget/Widget.jsx#L150-L214)
- [frontend/src/widget/widget.css:33-55](file://frontend/src/widget/widget.css#L33-L55)