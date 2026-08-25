LIVE DEMO - https://missionguard-frontend.onrender.com

# MissionGuard AI 🛰️

### AI-Powered Mission Operations Copilot

MissionGuard is a Human-in-the-Loop decision-support platform designed for satellite mission operations.

Rather than simply displaying mission alerts, MissionGuard helps operators understand:

* What happened
* Why it matters
* What happens if ignored
* What should be done next

MissionGuard assists operators with intelligent recommendations while ensuring that final mission authority always remains with human engineers.

---

## FAR AWAY 2026 Submission

**Theme:** Space Technology + Agentic AI

MissionGuard demonstrates how AI-assisted decision support can improve mission awareness, alert prioritization, and operational planning for satellite missions.

---

## Features

* Real satellite visualization
* Communication window alerts
* Conjunction risk alerts
* Battery health alerts
* Agent reasoning timeline
* Mission impact assessment
* Recommended actions
* Human-in-the-Loop decision support

---

## System Architecture

```text
CelesTrak TLE Data
        ↓
Skyfield Orbit Propagation
        ↓
Alert Detection Engine
(Communication | Conjunction | Battery)
        ↓
MissionGuard Decision Engine
(Priority + Reasoning + Impact)
        ↓
MissionGuard Dashboard
        ↓
Human Operator
(Review → Decide → Act)
```

---

## Technology Stack

### Frontend

* React
* Vite

### Backend

* FastAPI
* Python

### Space Data

* CelesTrak

### Orbit Propagation

* Skyfield + SGP4

---

## Quick Start

### Terminal 1 — Backend

```bash
cd Backend
pip install -r requirements.txt
python main.py
```

Backend runs at:

```text
http://localhost:8000
```

---

### Terminal 2 — Frontend

```bash
cd Frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

---

## What You'll See

*  3D Earth with real satellite orbital visualization
*  Active mission alerts
*  AI reasoning timeline
*  Mission impact analysis
*  Operational timeline
*  Recommended actions

---

## API Endpoints

### Get Satellite Positions

```http
GET /satellites
```

Returns estimated satellite positions and orbital trajectories.

### Get Mission Alerts

```http
GET /alerts
```

Returns prioritized alerts, reasoning, and mission impact assessment.

### Refresh Orbital Data

```http
GET /refresh
```

Refreshes orbital data and recalculates positions.

---

## Human-in-the-Loop Safety

### MissionGuard DOES NOT

* Control satellites
* Execute commands
* Override operators
* Make autonomous mission decisions

### MissionGuard DOES

* Prioritize alerts
* Explain consequences
* Recommend actions
* Support operator decision-making

---

## Future Scope

* AI Mission Copilot Chat
* Predictive Risk Forecasting
* Fleet-Wide Operations
* Telemetry Integration
* Multi-Satellite Decision Support

---

## Data Sources

* CelesTrak — Satellite Orbital Data
* Skyfield — Orbit Propagation Library

---

## Team Vision

MissionGuard transforms mission monitoring into mission intelligence.

Instead of asking:

"What happened?"

MissionGuard helps operators answer:

"What happened, why does it matter, and what should happen next?"
