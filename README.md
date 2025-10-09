<div align="center">

# 🎭 Emote System

**Reacting in Real‑Time: Emotes and Kafka in Action**

[![Status](https://img.shields.io/badge/status-active-success?style=flat-square)]()
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white&style=flat-square)]()
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white&style=flat-square)]()
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=0A0A0A&style=flat-square)]()
[![Kafka](https://img.shields.io/badge/Kafka-KRaft-231F20?logo=apachekafka&logoColor=white&style=flat-square)]()
[![License](https://img.shields.io/badge/License-Educational-blue?style=flat-square)]()

<br/>
<i>A distributed, event‑driven web application built for COMP.CS.510 (Spring 2025). It simulates viewer emote reactions, processes them through a real-time analytics pipeline, and delivers significant moments to users via WebSocket connections.</i>

</div>

---

### Quick links
- ↪ Architecture: high‑level diagram and flow
- ⚙️ Getting Started: one‑command Docker launch
- 🔌 API & Contracts: REST, WebSocket, Kafka
- 🧠 Features: real‑time, configurable analysis, animations
- 🛣️ Roadmap & Contributions

---

## Table of contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Screenshots](#screenshots)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API & contracts](#api--contracts)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Overview
The system enables viewers of live streams to react to meaningful moments with emotes. Raw reactions are processed into “significant moments” and pushed to the frontend over WebSocket for a live experience.

## Architecture

### Components
- **Emote Generator**: A Node.js service using `KafkaJS` that simulates user activity by producing a continuous stream of emote events. It generates both single emotes and bursts of emotes to create realistic data patterns for testing the system's processing capabilities.
- **Server B (Analyzer + Settings API)**: A Node.js service that serves as the core data processing engine. It uses `KafkaJS` to consume raw emote events from the `raw-emote-data` topic. The service aggregates these events into time windows, analyzes them to identify "significant moments" based on configurable thresholds, and then publishes these moments to the `aggregated-emote-data` topic. It also exposes a REST API using `Express` for dynamically configuring the analysis parameters (e.g., interval, threshold, and allowed emotes).
- **Server A (WebSocket Gateway)**: A Node.js service responsible for real-time communication with the frontend. It uses `KafkaJS` to consume the `aggregated-emote-data` topic and broadcasts these significant moments to all connected clients via a WebSocket server implemented with the `ws` library.
- **Frontend**: A `React` single-page application that provides a user interface for visualizing significant moments and adjusting the analysis settings. It's served by `Nginx`, which also acts as a reverse proxy, directing API requests (`/api`) to Server B and WebSocket connections (`/ws`) to Server A.
- **Kafka**: The central message broker of the system, running in KRaft mode (without Zookeeper). It decouples the services, enabling them to communicate asynchronously and ensuring data durability and scalability.

### Data flow (mermaid)
```mermaid
flowchart LR
    subgraph "Backend Services"
        EG[Emote Generator<br/>Node.js]
        SB[Server B<br/>Analyzer + REST]
        SA[Server A<br/>WebSocket]
        K[(Kafka)]
    end

    subgraph "Frontend"
        FE[User Interface<br/>React + Nginx]
    end

    EG -- "raw-emote-data<br/>{\"emote\": \"🔥\", ...}" --> K
    K -- "raw-emote-data" --> SB
    SB -- "aggregated-emote-data<br/>[{\"emote\": \"🔥\", ...}]" --> K
    K -- "aggregated-emote-data" --> SA
    SA -- "WebSocket<br/>{\"type\": \"significant-moments\", ...}" --> FE
    FE -- "HTTP API<br/>GET /settings" --> SB
```

### Kafka Topics
- `raw-emote-data`: Carries raw emote events from the Emote Generator to Server B. Each message represents a single emote reaction.
- `aggregated-emote-data`: Transports processed, significant moments from Server B to Server A. Each message contains a batch of moments that have met the defined analysis criteria.

## Features

-   **Real-time Updates**: The system delivers significant moments to the frontend in real time using a WebSocket connection. **Server A** listens for messages on the `aggregated-emote-data` Kafka topic and immediately broadcasts them to all connected clients. The React frontend uses a `useEffect` hook to manage the WebSocket lifecycle, ensuring a persistent connection and updating the UI state as new moments arrive.

-   **Configurable Analysis**: The core analysis logic in **Server B** is highly configurable via a REST API. The frontend can dynamically adjust the `interval` (the number of messages to process in a batch), the `threshold` (the ratio required for a moment to be considered significant), and the list of `allowedEmotes`. These settings are held in memory on Server B and directly influence the behavior of the `analyzeEmotes` function.

-   **Interactive UI with Animations**: The React frontend provides a user-friendly interface for both viewing significant moments and configuring the system. When a new significant moment is received, the application triggers a floating emote animation using CSS. This provides immediate visual feedback and enhances the user experience.

-   **Fully Containerized**: The entire application stack is defined in `docker-compose.yml`, allowing for a consistent, one-command startup of all services, including the Kafka message broker. This simplifies the development setup and ensures that the application runs the same way in any environment.

## Screenshots
Add your media to `frontend/public/` and reference here.
- Demo GIF (WebSocket updates + animations)
- Settings panel (interval, threshold, allowed emotes)

## Getting started

This project is designed to be run with Docker Compose, but individual services can also be run locally for development.

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+) and npm (if running services locally)

### Docker Compose (Recommended)

This is the simplest way to start the entire system.

1.  **Start all services:**
    ```bash
    docker-compose up -d
    ```
2.  **Open the application:**
    Navigate to `http://localhost:8080` in your browser.

3.  **View logs:**
    To view the logs for all services, run:
    ```bash
    docker-compose logs -f
    ```
    Or for a specific service (e.g., `server-b`):
    ```bash
    docker-compose logs -f server-b
    ```

4.  **Stop all services:**
    ```bash
    docker-compose down
    ```

### Local Development (Manual)

If you want to run services individually without Docker:

1.  **Start Kafka:**
    You still need Kafka running. You can start just Kafka using Docker Compose:
    ```bash
    docker-compose up -d kafka
    ```
2.  **Run a service:**
    For each service (`emote-generator`, `server-a`, `server-b`, `frontend`):
    - Navigate to the service directory (e.g., `cd server-b`).
    - Install dependencies: `npm install`.
    - Set environment variables (see [Configuration](#configuration)) and start the service: `npm start`.

    **Example for Server B:**
    ```bash
    cd server-b
    npm install
    export KAFKA_BROKER=localhost:9092
    export KAFKA_TOPIC_IN=raw-emote-data
    export KAFKA_TOPIC_OUT=aggregated-emote-data
    export PORT=3001
    npm start
    ```
3.  **Run the frontend:**
    The frontend requires a slightly different setup.
    ```bash
    cd frontend
    npm install
    npm start
    ```
    The React development server will open the app at `http://localhost:3000`. The API and WebSocket URLs in `src/App.js` are pre-configured to point to `localhost:3001` and `localhost:3002`.

## Configuration

The system is configured using environment variables, which are defined in `docker-compose.yml` for containerized deployment and can be set in the shell for local development.

### Environment Variables

**Emote Generator:**
-   `KAFKA_BROKER`: The address of the Kafka broker. Default: `kafka:9092`.
-   `KAFKA_TOPIC`: The topic to which raw emote data is published. Default: `raw-emote-data`.

**Server B (Analyzer + Settings API):**
-   `KAFKA_BROKER`: The address of the Kafka broker. Default: `kafka:9092`.
-   `KAFKA_TOPIC_IN`: The topic from which to consume raw emote data. Default: `raw-emote-data`.
-   `KAFKA_TOPIC_OUT`: The topic to which aggregated data is published. Default: `aggregated-emote-data`.
-   `PORT`: The port on which the REST API server runs. Default: `3001`.

**Server A (WebSocket Gateway):**
-   `KAFKA_BROKER`: The address of the Kafka broker. Default: `kafka:9092`.
-   `KAFKA_TOPIC`: The topic from which to consume aggregated data. Default: `aggregated-emote-data`.
-   `PORT`: The port on which the WebSocket server runs. Default: `3002`.

**Frontend:**
-   `WEBSOCKET_URL`: The URL for the WebSocket server (Server A). Used by the Nginx proxy. Default: `ws://localhost:3002`.
-   `API_URL`: The URL for the REST API (Server B). Used by the Nginx proxy. Default: `http://localhost:3001`.

### Customization

To customize the configuration for Docker Compose, you can create a `.env` file in the root of the project and override the default values. For example, to change the port for the frontend:

```env
# .env file
FRONTEND_PORT=8081
```

Then, modify `docker-compose.yml` to use this variable:
```yaml
services:
  frontend:
    ports:
      - "${FRONTEND_PORT:-8080}:80"
```
This will expose the frontend on port `8081`, or `8080` if the variable is not set.

## API & contracts

This section details the data contracts for the REST API, WebSocket connections, and Kafka topics.

### Server B – Settings API (REST)

Server B exposes a REST API for managing the analysis settings.

**Endpoints:**

-   `GET /settings/interval`
    -   **Description**: Retrieves the current analysis interval.
    -   **Response**: `200 OK`
        ```json
        {
          "interval": 30
        }
        ```

-   `PUT /settings/interval`
    -   **Description**: Updates the analysis interval.
    -   **Request Body**:
        ```json
        {
          "interval": 50
        }
        ```
    -   **Response**: `200 OK`
        ```json
        {
          "interval": 50
        }
        ```
    -   **Error**: `400 Bad Request` if `interval` is not a positive number.

-   `GET /settings/threshold`
    -   **Description**: Retrieves the current significance threshold.
    -   **Response**: `200 OK`
        ```json
        {
          "threshold": 0.3
        }
        ```

-   `PUT /settings/threshold`
    -   **Description**: Updates the significance threshold.
    -   **Request Body**:
        ```json
        {
          "threshold": 0.5
        }
        ```
    -   **Response**: `200 OK`
        ```json
        {
          "threshold": 0.5
        }
        ```
    -   **Error**: `400 Bad Request` if `threshold` is not a number between 0 and 1.

-   `GET /settings/allowed-emotes`
    -   **Description**: Retrieves the list of emotes being tracked.
    -   **Response**: `200 OK`
        ```json
        {
          "allowedEmotes": ["😀", "😡", "😢", "😮", "❤️", "👍", "👎", "🔥"]
        }
        ```

-   `PUT /settings/allowed-emotes`
    -   **Description**: Updates the list of tracked emotes.
    -   **Request Body**:
        ```json
        {
          "allowedEmotes": ["❤️", "🔥"]
        }
        ```
    -   **Response**: `200 OK`
        ```json
        {
          "allowedEmotes": ["❤️", "🔥"]
        }
        ```
    -   **Error**: `400 Bad Request` if `allowedEmotes` is not a non-empty array.


### Server A – WebSocket

Server A broadcasts messages to all connected frontend clients.

**Connection:**
-   Upon successful connection, the server sends a welcome message:
    ```json
    {
      "type": "connection",
      "message": "Connected to Server A"
    }
    ```

**Broadcast Messages:**
-   When significant moments are detected, the server broadcasts the following message:
    ```json
    {
      "type": "significant-moments",
      "data": [
        {
          "emote": "🔥",
          "timestamp": "2025-05-01T10:20:30.000Z",
          "count": 42,
          "ratio": 0.72
        }
      ]
    }
    ```

### Kafka Payloads

**Topic: `raw-emote-data`**
-   **Producer**: Emote Generator
-   **Consumer**: Server B
-   **Description**: Contains individual emote events as they are generated.
-   **Payload Example**:
    ```json
    {
      "emote": "👍",
      "timestamp": "2025-05-01T10:20:30.123Z"
    }
    ```

**Topic: `aggregated-emote-data`**
-   **Producer**: Server B
-   **Consumer**: Server A
-   **Description**: Contains an array of significant moments identified during an analysis window.
-   **Payload Example**:
    ```json
    [
      {
        "emote": "🔥",
        "timestamp": "2025-05-01T10:20:00.000Z",
        "count": 42,
        "total": 58,
        "ratio": 0.724
      },
      {
        "emote": "❤️",
        "timestamp": "2025-05-01T10:20:00.000Z",
        "count": 35,
        "total": 58,
        "ratio": 0.603
      }
    ]
    ```

## Project Structure

The repository is organized into several top-level directories, each representing a distinct service or component of the system.

```text
./
├── docker-compose.yml      # Defines and configures all services for a one-command launch.
├── emote-generator/        # Service to simulate and generate emote data.
│   ├── Dockerfile          # Docker build definition for the emote generator.
│   ├── index.js            # Main application logic for generating emotes and sending them to Kafka.
│   └── package.json        # Node.js dependencies (`kafkajs`).
├── server-a/               # WebSocket gateway service.
│   ├── Dockerfile          # Docker build definition for Server A.
│   ├── index.js            # Consumes aggregated data from Kafka and broadcasts it via WebSockets.
│   └── package.json        # Node.js dependencies (`express`, `ws`, `kafkajs`, `cors`).
├── server-b/               # Analysis and settings API service.
│   ├── Dockerfile          # Docker build definition for Server B.
│   ├── index.js            # Consumes raw data, analyzes it, and exposes the settings API.
│   └── package.json        # Node.js dependencies (`express`, `kafkajs`, `cors`, `body-parser`).
├── frontend/               # React frontend application.
│   ├── Dockerfile          # Multi-stage Docker build for the React app and Nginx server.
│   ├── nginx.conf          # Nginx configuration for serving the app and proxying API/WebSocket requests.
│   ├── package.json        # Node.js dependencies (`react`, `axios`).
│   ├── public/             # Public assets for the React app.
│   └── src/                # React application source code.
│       └── App.js          # The main React component containing the UI and application logic.
├── documentation.md        # Course-specific documentation and design notes.
└── README.md               # This file.
```

## Roadmap
- Persist settings and moments (DB/Redis)
- AuthN/Z for Settings API
- Richer analysis (adaptive thresholds, time windows)
- Observability (metrics/dashboards)

## Contributing
Issues and PRs are welcome. For larger changes, open an issue first to discuss direction.

## License
Educational license for COMP.CS.510. If you reuse, please credit the author(s).

## Acknowledgements
- Course brief: COMP.CS.510 Advanced Web Development – Back End (Spring 2025)
- Bitnami Kafka (KRaft) image
- KafkaJS – modern Kafka client for Node.js



