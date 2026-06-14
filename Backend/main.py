from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from satellites import get_satellite_positions
from alerts import get_alerts, get_priority_order, get_mission_summary
import uvicorn

app = FastAPI(title="MissionGuard AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cached_sats = None

@app.get("/satellites")
def satellites():
    global _cached_sats
    if not _cached_sats:
        _cached_sats = get_satellite_positions()
    return {"satellites": _cached_sats}

@app.get("/alerts")
def alerts():
    global _cached_sats
    if not _cached_sats:
        _cached_sats = get_satellite_positions()
    raw = get_alerts(_cached_sats)
    prioritized = get_priority_order(raw)
    summary = get_mission_summary(prioritized)
    return {"alerts": prioritized, "summary": summary}

@app.get("/refresh")
def refresh():
    global _cached_sats
    _cached_sats = get_satellite_positions()
    return {"status": "refreshed", "count": len(_cached_sats)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)