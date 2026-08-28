# Razorpay Sentinel

**Security Intelligence Dashboard** — Internal risk operations center for detecting, attacking, and defending payment fraud blind spots.

```
                    RAZORPAY SENTINEL
                  Security Intelligence
                         Dashboard
                             │
                             ▼
                  ┌──────────────────┐
                  │ Next.js + React  │
                  │    Dashboard     │
                  └────────┬─────────┘
                           │ REST/WSS
                           ▼
                  ┌──────────────────┐
                  │ Node.js + Express│
                  │    TypeScript    │
                  └────────┬─────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     PostgreSQL          Redis          Razorpay
     Main Database       Cache          Test Mode
          │
          ▼
        Neo4j
    Payment Graph
          │
          ▼
   ┌──────────────────────┐
   │ Python + FastAPI      │
   │ AI/Risk Engine        │
   └──────────┬───────────┘
              │
       ┌──────┼────────┐
       ▼      ▼        ▼
      ML    Graph    Red-Team
    Engine   AI      Simulator
       │      │        │
       └──────┼────────┘
              ▼
        Defense Engine
              │
              ▼
          Grok API
```

## The Story

```
SEE RISK → ATTACK SYSTEM → FIND BLIND SPOT → UNDERSTAND WHY → GENERATE DEFENSE → PROVE DEFENSE WORKS
```

## Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Executive Risk Overview | `/` | Real-time security posture |
| AI Attack Simulator | `/attacks` | Red-team engine finds blind spots |
| Transaction Graph | `/graph` | Neo4j network visualization |
| AI Investigation | `/investigate` | Graph AI + Grok API risk analysis |
| Blind Spots | `/blind-spots` | Discovered detection gaps |
| Defense Lab | `/defense` | AI counter-measures & validation |
| Chargebacks | `/chargebacks` | Evidence collection and win probability |
| Model Evaluation | `/ml-evaluation` | Hold-out precision/recall, FP cost, ROC, drift, retrain |
| Audit & Security | `/audit` | Immutable operation log |

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- Docker & Docker Compose (for databases)

### 1. Start Infrastructure

```bash
docker compose up postgres redis neo4j -d
```

### 2. Start AI Engine

```bash
cd ai-engine
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start Backend

```bash
cd backend
npm install
npm run dev
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Open Dashboard

Visit **http://localhost:3000**

**Login:** `admin@razorpay.com` / `sentinel123`

### Full Stack (Docker)

```bash
docker compose up --build
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript, Tailwind, shadcn/ui, React Flow, Recharts, TanStack Query, Framer Motion |
| Backend | Node.js, Express, TypeScript, Zod, JWT/RBAC, Helmet, Rate Limiting |
| AI Engine | Python, FastAPI, scikit-learn, XGBoost, Pandas, NumPy |
| Graph | Neo4j |
| Database | PostgreSQL, Redis |
| AI | Grok API (optional) |
| Payment | Razorpay Test Mode |

## Architecture Decision

The dashboard, payment orchestration, and AI risk engine are **independently deployable services**:

- **Frontend** (port 3000) — Next.js dashboard
- **Backend** (port 4000) — Express API + WebSocket
- **AI Engine** (port 8000) — FastAPI ML/risk/scoring

This is production-grade microservice architecture, not a monolith demo.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Optional: Set `GROK_API_KEY` for live AI assessments (mock responses used otherwise).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate |
| GET | `/api/overview` | Executive metrics |
| GET | `/api/attacks/current` | Current simulation |
| POST | `/api/attacks/start` | Start attack |
| POST | `/api/attacks/evolve` | Evolve attack (+1 gen) |
| GET | `/api/graph/network` | Transaction graph |
| POST | `/api/graph/investigate` | AI investigation |
| GET | `/api/blind-spots` | Discovered blind spots |
| POST | `/api/defense/generate` | Generate defense |
| POST | `/api/defense/simulate` | Re-run attacks |
| GET | `/api/audit` | Audit trail |
| GET | `/api/ml/metrics` | Hold-out precision/recall, ROC, FP cost per detector |
| POST | `/api/ml/evaluate` | Re-run measurement suite |
| GET | `/api/ml/monitoring` | Drift, retrain gates, version history |
| POST | `/api/ml/retrain` | Retrain and promote champion (admin) |
| WS | `/ws` | Live event feed |

## License

Internal — Razorpay Sentinel Project
