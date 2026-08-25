from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from satellites import get_satellite_positions
from alerts import get_alerts, get_priority_order, get_mission_summary
import workflow
import uvicorn

app = FastAPI(title="MissionGuard AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cached_sats = None

# ── EXISTING MVP ROUTES — UNCHANGED ─────────────────────────────────────────

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


# ── ROUND 2 — INTERRUPTION HANDLING & CHANGE HISTORY (ADDITIVE) ─────────────

_DEFAULT_MISSION_STATE = {
    "comms_001": {"battery_pct": 78, "risk": "HIGH"},
    "conjunction_001": {"miss_distance_m": 847, "risk": "MEDIUM"},
    "battery_001": {"battery_pct": 62, "risk": "LOW"},
}


class MissionStateChange(BaseModel):
    field: str
    value: float


class PauseRequest(BaseModel):
    reason: str | None = None


@app.post("/analysis/{alert_id}/start")
def start_analysis(alert_id: str, satellite: str = "", alert_type: str = ""):
    mission_state = _DEFAULT_MISSION_STATE.get(alert_id, {"risk": "MEDIUM"})
    wf = workflow.start_analysis(alert_id, satellite, alert_type, mission_state)
    return wf


@app.get("/analysis/{alert_id}")
def get_analysis(alert_id: str):
    wf = workflow.get_workflow(alert_id)
    if not wf:
        raise HTTPException(status_code=404, detail="No workflow for this alert yet")
    return {**wf, "stages": workflow.STAGES}


@app.post("/analysis/{alert_id}/advance")
def advance(alert_id: str):
    _require(alert_id)
    return workflow.advance_step(alert_id)


@app.post("/analysis/{alert_id}/pause")
def pause_analysis(alert_id: str, body: PauseRequest = PauseRequest()):
    _require(alert_id)
    return workflow.pause(alert_id, reason=body.reason or "Operator requested pause")


@app.post("/analysis/{alert_id}/interrupt")
def interrupt_analysis(alert_id: str):
    _require(alert_id)
    return workflow.simulate_interruption(alert_id)


@app.post("/analysis/{alert_id}/mission-state")
def mission_state_change(alert_id: str, body: MissionStateChange):
    _require(alert_id)
    return workflow.change_mission_state(alert_id, body.field, body.value)


@app.post("/analysis/{alert_id}/recover")
def recover_analysis(alert_id: str):
    _require(alert_id)
    return workflow.recover(alert_id)


@app.post("/analysis/{alert_id}/reassess")
def reassess_analysis(alert_id: str):
    _require(alert_id)
    return workflow.reassess(alert_id)


@app.post("/analysis/{alert_id}/approve")
def approve_analysis(alert_id: str):
    _require(alert_id)
    return workflow.approve(alert_id)


@app.get("/change-history")
def change_history(alert_id: str | None = None):
    return {"events": workflow.get_history(alert_id)}


def _require(alert_id: str):
    if not workflow.get_workflow(alert_id):
        raise HTTPException(status_code=404, detail="Start analysis for this alert first")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
