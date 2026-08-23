"""
MissionGuard Round 2 — Interruption Handling & Change History
----------------------------------------------------------------
Additive module. Does NOT touch satellites.py / alerts.py / existing routes.

Models an AI mission-analysis workflow as RECOVERABLE OPERATIONAL STATE:
  - stages of reasoning, tracked per alert
  - checkpoints (saved on pause / step completion)
  - simulated interruption
  - mission-state snapshots compared on recovery
  - rule-based AI reassessment when mission state changed during interruption
  - a full chronological, inspectable change-history log
"""

from datetime import datetime, timezone
import itertools

STAGES = [
    "ALERT_DETECTED",
    "MISSION_CONTEXT",
    "RISK_ANALYSIS",
    "CONSEQUENCE_ANALYSIS",
    "RECOMMENDATION",
    "HUMAN_APPROVAL",
]

_workflows = {}          # alert_id -> workflow state dict
_history = []            # global chronological log (list of event dicts)
_checkpoint_seq = itertools.count(1)
_event_seq = itertools.count(1)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _log(alert_id, event_type, previous_state=None, new_state=None,
          reason=None, checkpoint_ref=None):
    event = {
        "id": next(_event_seq),
        "timestamp": _now(),
        "event_type": event_type,
        "alert_id": alert_id,
        "previous_state": previous_state,
        "new_state": new_state,
        "reason": reason,
        "checkpoint_ref": checkpoint_ref,
    }
    _history.append(event)
    return event


def _risk_rank(r):
    return {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}.get(r, 0)


def start_analysis(alert_id, satellite, alert_type, mission_state):
    """mission_state: arbitrary dict snapshot relevant to this alert
    (e.g. {"battery_pct": 62, "risk": "MEDIUM"})"""
    wf = {
        "alert_id": alert_id,
        "satellite": satellite,
        "alert_type": alert_type,
        "stage_index": 0,
        "completed_stages": [],
        "status": "RUNNING",
        "mission_state": dict(mission_state),
        "checkpoint": None,
        "recommendation": None,
        "reassessment": None,
        "needs_reassessment": False,
    }
    _workflows[alert_id] = wf
    _log(alert_id, "ALERT_CREATED", new_state={"alert_type": alert_type})
    _log(alert_id, "ANALYSIS_STARTED", new_state={"stage": STAGES[0]})
    return wf


def get_workflow(alert_id):
    return _workflows.get(alert_id)


def advance_step(alert_id):
    """Complete the current stage and move to the next one."""
    wf = _workflows[alert_id]
    if wf["status"] not in ("RUNNING", "RESUMED"):
        return wf
    stage = STAGES[wf["stage_index"]]
    wf["completed_stages"].append(stage)
    _log(alert_id, "STEP_COMPLETED", new_state={"stage": stage})
    if wf["stage_index"] < len(STAGES) - 1:
        wf["stage_index"] += 1
    else:
        wf["status"] = "COMPLETED"
        _log(alert_id, "ANALYSIS_COMPLETED")
    return wf


def pause(alert_id, reason="Operator requested pause"):
    wf = _workflows[alert_id]
    cp_id = f"CP-{next(_checkpoint_seq):02d}"
    wf["checkpoint"] = {
        "id": cp_id,
        "stage_index": wf["stage_index"],
        "completed_stages": list(wf["completed_stages"]),
        "mission_snapshot": dict(wf["mission_state"]),
        "timestamp": _now(),
    }
    wf["status"] = "PAUSED"
    # A new checkpoint starts a fresh interruption cycle — clear any
    # reassessment/recommendation left over from a previous cycle so the
    # UI doesn't show stale information.
    wf["reassessment"] = None
    wf["recommendation"] = None
    wf["needs_reassessment"] = False
    _log(alert_id, "CHECKPOINT_SAVED", checkpoint_ref=cp_id,
         new_state={"stage": STAGES[wf["stage_index"]]})
    _log(alert_id, "PAUSED", reason=reason)
    return wf


def simulate_interruption(alert_id):
    wf = _workflows[alert_id]
    if wf["status"] != "PAUSED":
        pause(alert_id, reason="Auto-checkpoint before interruption")
    wf["status"] = "INTERRUPTED"
    _log(alert_id, "INTERRUPTED", reason="Simulated session interruption")
    return wf


def change_mission_state(alert_id, field, new_value):
    wf = _workflows[alert_id]
    old_value = wf["mission_state"].get(field)
    wf["mission_state"][field] = new_value
    _log(alert_id, "MISSION_STATE_CHANGED",
         previous_state={field: old_value}, new_state={field: new_value})
    return wf


def recover(alert_id):
    wf = _workflows[alert_id]
    cp = wf["checkpoint"]
    if not cp:
        return wf
    # restore exact checkpoint
    wf["stage_index"] = cp["stage_index"]
    wf["completed_stages"] = list(cp["completed_stages"])
    wf["status"] = "RECOVERED"
    _log(alert_id, "RECOVERED", checkpoint_ref=cp["id"],
         new_state={"stage": STAGES[wf["stage_index"]]})

    # compare checkpoint snapshot vs current mission state
    changed = {
        k: {"from": v, "to": wf["mission_state"].get(k)}
        for k, v in cp["mission_snapshot"].items()
        if wf["mission_state"].get(k) != v
    }
    if changed:
        wf["needs_reassessment"] = True
        _log(alert_id, "STATE_CHANGE_DETECTED", previous_state=cp["mission_snapshot"],
             new_state=wf["mission_state"])
    else:
        wf["needs_reassessment"] = False

    wf["status"] = "RESUMED"
    _log(alert_id, "RESUMED", new_state={"stage": STAGES[wf["stage_index"]]})
    return wf


def reassess(alert_id):
    """Rule-based AI reassessment. Compares checkpoint snapshot to current
    mission state and produces an explanation + updated recommendation."""
    wf = _workflows[alert_id]
    cp = wf["checkpoint"]
    if not cp or not wf.get("needs_reassessment"):
        return wf

    old = cp["mission_snapshot"]
    new = wf["mission_state"]
    reasons = []
    old_risk = old.get("risk", "MEDIUM")
    new_risk = old_risk

    if "battery_pct" in old and "battery_pct" in new and new["battery_pct"] < old["battery_pct"]:
        drop = old["battery_pct"] - new["battery_pct"]
        reasons.append(
            f"Battery state decreased from {old['battery_pct']}% to {new['battery_pct']}% "
            f"during the interruption."
        )
        levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        idx = levels.index(old_risk) if old_risk in levels else 0
        if new["battery_pct"] < 25:
            idx = len(levels) - 1
        elif drop >= 5:
            idx = min(idx + 1, len(levels) - 1)
        new_risk = levels[idx]

    if "miss_distance_m" in old and "miss_distance_m" in new and new["miss_distance_m"] < old["miss_distance_m"]:
        reasons.append(
            f"Conjunction miss distance tightened from {old['miss_distance_m']}m to "
            f"{new['miss_distance_m']}m during the interruption."
        )
        if new["miss_distance_m"] < 500:
            new_risk = "CRITICAL"

    if not reasons:
        reasons.append("Mission state changed, but not in a way that alters risk posture.")

    if _risk_rank(new_risk) > _risk_rank(old_risk):
        wf["mission_state"]["risk"] = new_risk
        recommendation = (
            f"Risk escalated from {old_risk} to {new_risk}. Priority reassignment "
            f"recommended — this alert should now be actioned before lower-priority items."
        )
    else:
        recommendation = "Risk level unchanged. Continue with the previously planned action."

    wf["reassessment"] = {
        "explanation": " ".join(reasons),
        "previous_risk": old_risk,
        "new_risk": new_risk,
    }
    wf["recommendation"] = recommendation
    _log(alert_id, "AI_REASSESSMENT", previous_state={"risk": old_risk},
         new_state={"risk": new_risk}, reason=" ".join(reasons))
    _log(alert_id, "RECOMMENDATION_UPDATED", new_state={"recommendation": recommendation})
    wf["needs_reassessment"] = False
    return wf


def approve(alert_id):
    wf = _workflows[alert_id]
    wf["status"] = "RUNNING"
    _log(alert_id, "OPERATOR_APPROVED")
    return wf


def get_history(alert_id=None):
    if alert_id:
        return [e for e in _history if e["alert_id"] == alert_id]
    return list(_history)