from datetime import datetime, timezone
import math, random

def get_alerts(satellites: list) -> list:
    now = datetime.now(timezone.utc)
    alerts = []

    # --- ALERT 1: COMMUNICATION WINDOW (always fires, most critical) ---
    alerts.append({
        "id": "comms_001",
        "type": "COMMUNICATION WINDOW",
        "satellite": satellites[0]["name"] if satellites else "CARTOSAT-3",
        "icon": "📡",
        "color": "critical",
        "time_remaining_min": 18,
        "detail": "Ground station visibility ending at Bengaluru ISTRAC",
        "mission_impact": "HIGH",
        "current_risk": "HIGH",
        "if_actioned": "LOW",
        "if_ignored": "CRITICAL",
        "consequences": [
            "Communication blackout begins",
            "Next contact window: +8h 14m",
            "Command upload delayed",
            "Conjunction review package cannot be uplinked"
        ],
        "recommended_action": "Upload command sequence immediately. Initiate data downlink for payload imagery.",
        "reasoning_steps": [
            {"time_offset": 0,  "msg": "Communication window alert received"},
            {"time_offset": 45, "msg": "Checking ground station visibility schedule..."},
            {"time_offset": 90, "msg": "ISTRAC Bengaluru — visibility ends in 18 minutes"},
            {"time_offset": 120,"msg": "Evaluating consequence of missed window..."},
            {"time_offset": 150,"msg": "Next opportunity: +8h 14m from now"},
            {"time_offset": 180,"msg": "Conjunction review upload depends on this window"},
            {"time_offset": 210,"msg": "Escalating to CRITICAL — immediate action required"},
            {"time_offset": 240,"msg": "Recommended: Upload command sequence NOW"},
        ]
    })

    # --- ALERT 2: CONJUNCTION ALERT (medium priority) ---
    sat2 = satellites[1]["name"] if len(satellites) > 1 else "EOS-04"
    alerts.append({
        "id": "conjunction_001",
        "type": "CONJUNCTION ALERT",
        "satellite": sat2,
        "icon": "⚠️",
        "color": "warning",
        "time_remaining_min": 263,  # 4h 23m
        "detail": "Debris object 2023-045C — Miss Distance: 847m",
        "mission_impact": "MEDIUM",
        "current_risk": "MEDIUM",
        "if_actioned": "LOW",
        "if_ignored": "HIGH",
        "consequences": [
            "Closest approach in 4h 23m",
            "Miss distance: 847m — within review threshold",
            "No immediate maneuver required",
            "Planning review needed before T-48h window"
        ],
        "recommended_action": "Flag for mission planning review. Schedule conjunction assessment within 2 hours. No immediate action required.",
        "reasoning_steps": [
            {"time_offset": 0,  "msg": "Conjunction alert received from tracking system"},
            {"time_offset": 45, "msg": "Retrieving debris object parameters..."},
            {"time_offset": 90, "msg": "Object: 2023-045C — Miss Distance: 847m"},
            {"time_offset": 120,"msg": "Time to closest approach: 4h 23m"},
            {"time_offset": 150,"msg": "Assessing immediate threat level..."},
            {"time_offset": 180,"msg": "Miss distance above 500m threshold — not immediately critical"},
            {"time_offset": 210,"msg": "However: planning review required before T-48h"},
            {"time_offset": 240,"msg": "Priority: MEDIUM — action within 2 hours"},
        ]
    })

    # --- ALERT 3: BATTERY ALERT (low priority) ---
    sat3 = satellites[2]["name"] if len(satellites) > 2 else "RESOURCESAT-2A"
    alerts.append({
        "id": "battery_001",
        "type": "BATTERY ALERT",
        "satellite": sat3,
        "icon": "🔋",
        "color": "low",
        "time_remaining_min": 360,  # 6h
        "detail": "State of charge at 34% — approaching operational threshold",
        "mission_impact": "LOW",
        "current_risk": "LOW",
        "if_actioned": "LOW",
        "if_ignored": "MEDIUM",
        "consequences": [
            "Battery reaches threshold in 6 hours",
            "Payload operations may be suspended",
            "Autonomous safe mode possible if unaddressed",
            "No immediate risk to mission"
        ],
        "recommended_action": "Monitor discharge rate. Schedule non-critical payload operations during next eclipse exit. No immediate action required.",
        "reasoning_steps": [
            {"time_offset": 0,  "msg": "Battery state-of-charge alert triggered"},
            {"time_offset": 45, "msg": "Current SOC: 34% — threshold at 25%"},
            {"time_offset": 90, "msg": "Discharge rate: nominal for current orbit phase"},
            {"time_offset": 120,"msg": "Time to threshold: approximately 6 hours"},
            {"time_offset": 150,"msg": "Next eclipse exit in 47 minutes — recharge expected"},
            {"time_offset": 180,"msg": "Recharge will bring SOC to ~68% — within safe range"},
            {"time_offset": 210,"msg": "No immediate action required"},
            {"time_offset": 240,"msg": "Priority: LOW — monitor for next 2 orbits"},
        ]
    })

    return alerts

def get_priority_order(alerts: list) -> list:
    priority_map = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    return sorted(alerts, key=lambda a: priority_map.get(a["mission_impact"], 99))

def get_mission_summary(alerts: list) -> dict:
    critical = sum(1 for a in alerts if a["mission_impact"] in ["CRITICAL", "HIGH"])
    return {
        "total_alerts": len(alerts),
        "critical_count": critical,
        "overall_status": "CRITICAL" if critical > 0 else "NOMINAL",
        "summary": f"{critical} alert{'s' if critical != 1 else ''} require immediate attention"
    }