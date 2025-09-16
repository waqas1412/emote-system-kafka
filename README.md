## Emote System – Reacting in Real‑Time: Emotes and Kafka in Action

A distributed, event‑driven web application built for COMP.CS.510 (Spring 2025) to demonstrate real‑time user reactions, stream analysis, and modern containerized deployment.

### Why this project
Viewers of a live stream react to meaningful moments using simple emotes. The system ingests these reactions, mines significant moments, and streams highlights to the UI in real‑time.

### Architecture overview
- **Emote Generator**: produces random emote events every second (80% single, 20% bursts)
- **Server B (Analyzer + Settings API)**: consumes raw events, aggregates “significant” moments, exposes REST for settings
- **Server A (WebSocket gateway)**: consumes aggregated moments and broadcasts to the frontend via WebSocket
- **Frontend (React + Nginx)**: displays live moments, lets users tweak analyzer settings
- **Kafka**: message broker (KRaft, no Zookeeper)

Kafka topics:
- `raw-emote-data`: emotes from generator → Server B
- `aggregated-emote-data`: significant moments from Server B → Server A

High‑level flow:
```
Emote Generator ──> [raw-emote-data] ──> Server B ──> [aggregated-emote-data] ──> Server A ──> Frontend (WS)
                                 ^  REST /settings  ^
                                 └──────────── Frontend (HTTP) ───────────────┘
```

## Features
- **Real‑time updates** over WebSocket
- **Configurable analysis** via REST API: interval, threshold, allowed emotes
- **Interactive UI** with floating animations for significant moments
- **Fully containerized** with Docker Compose (Kafka, services, frontend)

## Tech stack
- Backend: Node.js, KafkaJS
- Frontend: React (Create React App), Nginx
- Messaging: Apache Kafka (Bitnami image, KRaft mode)
- Orchestration: Docker & Docker Compose

## Repository structure
```
./
├─ docker-compose.yml             # Main stack (Kafka, generator, server-a, server-b, frontend)
├─ emote-generator/               # Emote producer (Node.js)
├─ server-a/                      # WS broadcaster (Node.js)
├─ server-b/                      # Analyzer + Settings API (Node.js)
├─ frontend/                      # React app + Nginx
├─ documentation.md               # Detailed design/notes
└─ quitters/                      # Course group variant with modular layout (alt implementation)
```

The `quitters/` directory contains a more modular, course‑structured variant (backend servers split into `server_a` and `server_b`, frontend hooks/components). The root stack is ready‑to‑run and used for demos.

## Quick start
Prerequisites: Docker and Docker Compose

1) Clone and start:
```bash
docker-compose up -d
```

2) Open the app:
```text
http://localhost:8080
```

3) What runs:
- Frontend (Nginx) on `:8080`
- Server A (WebSocket) on `:3002` (exposed for local dev)
- Server B (REST API) on `:3001` (exposed for local dev)
- Kafka (internal on `kafka:9092`)

To stop:
```bash
docker-compose down
```

## Configuration
The Compose file wires defaults for local development. Notable environment variables:
- Emote generator: `KAFKA_BROKER`, `KAFKA_TOPIC=raw-emote-data`
- Server B: `KAFKA_BROKER`, `KAFKA_TOPIC_IN=raw-emote-data`, `KAFKA_TOPIC_OUT=aggregated-emote-data`, `PORT=3001`
- Server A: `KAFKA_BROKER`, `KAFKA_TOPIC=aggregated-emote-data`, `PORT=3002`
- Frontend: built assets served by Nginx; proxies available at `/api` and `/ws` (see `frontend/nginx.conf`)

Note: For convenience in local demos, Server A and Server B ports are exposed. In stricter deployments, you can remove direct host port exposures and have the frontend proxy all traffic via Nginx.

## API & contracts
### Server B – Settings API (REST)
- `GET /settings/interval` → `{ interval: number }`
- `PUT /settings/interval` with `{ interval: number }`
- `GET /settings/threshold` → `{ threshold: number }`
- `PUT /settings/threshold` with `{ threshold: number }`
- `GET /settings/allowed-emotes` → `{ allowedEmotes: string[] }`
- `PUT /settings/allowed-emotes` with `{ allowedEmotes: string[] }`

### Server A – WebSocket
- Broadcasts messages with shape:
```json
{
  "type": "significant-moments",
  "data": [
    { "emote": "🔥", "timestamp": "2025-05-01T10:20:30.000Z", "count": 42, "ratio": 0.72 }
  ]
}
```

### Kafka messages
- Raw emote: `{ emote: string, timestamp: ISO8601 }`
- Aggregated moment: `{ emote: string, timestamp: ISO8601, count: number, ratio: number }`

## Frontend usage
- Live “Significant Moments” list updates via WebSocket
- Change analyzer settings in the Settings panel:
  - Interval (messages per analysis window)
  - Threshold (0–1)
  - Allowed emotes (toggle buttons)

## Development notes
- The system uses publish/subscribe via Kafka for loose coupling and scalability
- Frontend is served statically by Nginx; reverse proxy routes:
  - `/ws` → Server A (WebSocket)
  - `/api` → Server B (REST)
- For local dev, direct ports are also exposed; you can point the UI to `ws://localhost:3002` and `http://localhost:3001` (the default code paths already do this)

## Troubleshooting
- Kafka not healthy: Docker Compose waits for healthcheck; if services hang, try `docker-compose logs kafka` and ensure KRaft envs are supported on your platform
- WebSocket not connecting: verify Server A is up (`docker-compose logs server-a`) and that your browser can reach `ws://localhost:3002` (or use the Nginx `/ws` proxy)
- Settings API errors: check Server B logs and confirm `KAFKA_BROKER` resolvable as `kafka:9092` within the Docker network

## Extensibility ideas
- Persist settings and moments (PostgreSQL or Redis)
- Authentication for the settings API
- Richer analysis (adaptive thresholds, time‑windowed metrics)
- Observability (Prometheus/Grafana dashboards)

## Course alignment (COMP.CS.510)
This project fulfills the assignment’s core requirements:
- Dockerized backend and frontend with Compose and shared network
- Kafka topics for raw and aggregated data; producers/consumers implemented with KafkaJS
- Server B exposes REST settings API; Server A pushes updates via WebSocket
- Frontend shows significant moments and lets users change settings asynchronously (no page refresh)

For detailed rationale, patterns, and future improvements, see `documentation.md`.

## License
Educational project for COMP.CS.510. If you plan to reuse, please credit the author(s).


