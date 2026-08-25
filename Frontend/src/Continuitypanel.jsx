import { useState, useEffect, useCallback } from "react";

const API = "https://missionguard.onrender.com";

const COLOR = {
  bg: "#080D14",
  panel: "#0B1320",
  border: "#1A2740",
  borderBright: "#2A4060",
  critical: "#FF3B30",
  warning: "#FF9F0A",
  low: "#34C759",
  accent: "#0A84FF",
  text: "#E8F0FF",
  textDim: "#6B8AAA",
  textMid: "#A0B8D0",
};

const STAGE_LABELS = {
  ALERT_DETECTED: "Alert Detected",
  MISSION_CONTEXT: "Mission Context",
  RISK_ANALYSIS: "Risk Analysis",
  CONSEQUENCE_ANALYSIS: "Consequence Analysis",
  RECOMMENDATION: "Recommendation",
  HUMAN_APPROVAL: "Human Approval",
};

const STATUS_COLOR = {
  RUNNING: COLOR.low,
  PAUSED: COLOR.warning,
  INTERRUPTED: COLOR.critical,
  RECOVERED: COLOR.accent,
  RESUMED: COLOR.low,
  COMPLETED: COLOR.low,
};

// Plain-language "what's happening right now" + "what to click next"
// so a judge (or you, 6 months from now) understands this without
// reading code.
function getNarrative(started, status, wf) {
  if (!started) {
    return {
      story: "MissionGuard hasn't started thinking about this alert yet.",
      next: "Click \u201cStart Analysis\u201d to begin reasoning about it, step by step.",
    };
  }
  switch (status) {
    case "RUNNING":
    case "RESUMED":
      return {
        story: `MissionGuard is actively reasoning through this alert. It has reached the "${STAGE_LABELS[wf.stages?.[wf.stage_index]]}" step.`,
        next: "Click \u201cAdvance Step\u201d to think further, or \u201cPause\u201d to step away and save a checkpoint (simulating an operator getting interrupted).",
      };
    case "PAUSED":
      return {
        story: `The analysis is paused and a checkpoint (${wf.checkpoint?.id}) was saved, remembering exactly where it stopped: "${STAGE_LABELS[wf.stages?.[wf.stage_index]]}".`,
        next: "Click \u201cSimulate Interruption\u201d to act out a real interruption (e.g. the operator gets pulled away).",
      };
    case "INTERRUPTED":
      if (!wf.checkpoint) return { story: "Interrupted.", next: "" };
      return {
        story: "The session has been interrupted. The checkpoint is safely saved, but time is passing and real mission conditions may be changing.",
        next: "Click \u201cSimulate Mission Change\u201d to simulate something changing (e.g. battery draining) while no one was watching \u2014 then click \u201cRecover\u201d.",
      };
    case "RECOVERED":
      return {
        story: "Just recovered the exact checkpoint \u2014 the unfinished analysis is restored.",
        next: wf.needs_reassessment
          ? "Mission conditions changed while interrupted. Click \u201cAI Reassess\u201d to see if the old thinking still holds."
          : "Nothing meaningful changed \u2014 continue as normal.",
      };
    case "COMPLETED":
      return { story: "This analysis is complete.", next: "" };
    default:
      return { story: "", next: "" };
  }
}

function Btn({ children, onClick, disabled, tone = COLOR.accent }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "transparent" : `${tone}18`,
        border: `1px solid ${disabled ? COLOR.border : tone}`,
        color: disabled ? COLOR.textDim : tone,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        padding: "6px 10px",
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {children}
    </button>
  );
}

function EventRow({ ev }) {
  const color =
    ev.event_type.includes("CRITICAL") || ev.event_type === "INTERRUPTED"
      ? COLOR.critical
      : ev.event_type === "PAUSED" || ev.event_type === "STATE_CHANGE_DETECTED"
      ? COLOR.warning
      : ev.event_type.includes("RECOVER") || ev.event_type.includes("RESUM")
      ? COLOR.accent
      : COLOR.textMid;

  const time = new Date(ev.timestamp).toTimeString().slice(0, 8);

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: COLOR.textDim, fontFamily: "monospace", flexShrink: 0, width: 62 }}>
        {time}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.03em" }}>
          {ev.event_type.replaceAll("_", " ")}
          {ev.checkpoint_ref ? `  \u00b7  ${ev.checkpoint_ref}` : ""}
        </div>
        {ev.reason && (
          <div style={{ fontSize: 11, color: COLOR.textMid, marginTop: 2 }}>{ev.reason}</div>
        )}
        {ev.previous_state && ev.new_state && (
          <div style={{ fontSize: 10, color: COLOR.textDim, marginTop: 2 }}>
            {Object.keys(ev.new_state).map((k) => (
              <span key={k}>
                {k}: {String(ev.previous_state[k])} → {String(ev.new_state[k])}{" "}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContinuityPanel({ alert }) {
  const [wf, setWf] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const alertId = alert?.id;

  const refresh = useCallback(async () => {
    if (!alertId) return;
    try {
      const [wfRes, histRes] = await Promise.all([
        fetch(`${API}/analysis/${alertId}`),
        fetch(`${API}/change-history?alert_id=${alertId}`),
      ]);
      if (wfRes.ok) setWf(await wfRes.json());
      else setWf(null);
      if (histRes.ok) setHistory((await histRes.json()).events || []);
    } catch {
      // backend not reachable — leave panel empty
    }
  }, [alertId]);

  useEffect(() => {
    setWf(null);
    setHistory([]);
    refresh();
  }, [alertId, refresh]);

  const call = async (path, body) => {
    if (!alertId) return;
    setLoading(true);
    try {
      await fetch(`${API}/analysis/${alertId}${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  if (!alert) return null;

  const started = !!wf;
  const status = wf?.status;
  const currentStageLabel = wf ? STAGE_LABELS[wf.stages?.[wf.stage_index]] : null;
  const narrative = getNarrative(started, status, wf);

  return (
    <div style={{
      borderTop: `1px solid ${COLOR.border}`,
      background: COLOR.panel,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLOR.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.textDim, letterSpacing: "0.07em" }}>
          MISSION CONTINUITY — {alert.type}
        </div>
        <div style={{ fontSize: 10, color: COLOR.textDim, marginTop: 2 }}>
          Tracks only this one alert's unfinished reasoning — not the whole satellite.
        </div>
        {started && (
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: STATUS_COLOR[status] || COLOR.textMid,
              border: `1px solid ${STATUS_COLOR[status] || COLOR.border}`,
              padding: "2px 8px", borderRadius: 10,
            }}>{status}</span>
            <span style={{ fontSize: 11, color: COLOR.textMid }}>
              Stage: {currentStageLabel}
            </span>
            {wf.checkpoint && (
              <span style={{ fontSize: 10, color: COLOR.accent }}>
                {wf.checkpoint.id}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Plain-language story + what to do next */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLOR.border}`, flexShrink: 0, background: `${COLOR.accent}08` }}>
        <div style={{ fontSize: 12, color: COLOR.text, lineHeight: 1.5 }}>{narrative.story}</div>
        {narrative.next && (
          <div style={{ fontSize: 11, color: COLOR.accent, marginTop: 6, lineHeight: 1.5 }}>
            → {narrative.next}
          </div>
        )}
      </div>

      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLOR.border}`, flexShrink: 0 }}>
        {!started ? (
          <Btn onClick={() => call("/start?satellite=" + encodeURIComponent(alert.satellite) + "&alert_type=" + encodeURIComponent(alert.type))} disabled={loading}>
            Start Analysis
          </Btn>
        ) : (
          <>
            <Btn onClick={() => call("/advance")} disabled={loading || !["RUNNING", "RESUMED"].includes(status)}>
              Advance Step
            </Btn>
            <Btn onClick={() => call("/pause")} disabled={loading || !["RUNNING", "RESUMED"].includes(status)} tone={COLOR.warning}>
              Pause (step away)
            </Btn>
            <Btn onClick={() => call("/interrupt")} disabled={loading || status !== "PAUSED"} tone={COLOR.critical}>
              Simulate Interruption
            </Btn>
            <Btn
              onClick={() => call("/mission-state", { field: "battery_pct", value: Math.max(0, (wf.mission_state?.battery_pct ?? 60) - 8) })}
              disabled={loading || status !== "INTERRUPTED"}
              tone={COLOR.warning}
            >
              Simulate Mission Change
            </Btn>
            <Btn onClick={() => call("/recover")} disabled={loading || status !== "INTERRUPTED"} tone={COLOR.accent}>
              Recover (come back)
            </Btn>
            <Btn onClick={() => call("/reassess")} disabled={loading || !wf.needs_reassessment}>
              AI Reassess
            </Btn>
            <Btn onClick={() => call("/approve")} disabled={loading || !wf.recommendation} tone={COLOR.low}>
              Approve
            </Btn>
          </>
        )}
      </div>

      {wf?.reassessment && (
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLOR.border}`, background: `${COLOR.warning}0f`, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLOR.warning, letterSpacing: "0.05em", marginBottom: 4 }}>
            AI REASSESSMENT
          </div>
          <div style={{ fontSize: 11, color: COLOR.textMid, lineHeight: 1.5 }}>
            {wf.reassessment.explanation}
          </div>
          {wf.recommendation && (
            <div style={{ fontSize: 11, color: COLOR.text, marginTop: 6 }}>
              <strong>Updated recommendation:</strong> {wf.recommendation}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: COLOR.textDim, letterSpacing: "0.06em", marginBottom: 8 }}>
          CHANGE HISTORY
        </div>
        {history.length === 0 && (
          <div style={{ fontSize: 11, color: COLOR.textDim }}>No events yet — start analysis to begin.</div>
        )}
        {history.map((ev) => <EventRow key={ev.id} ev={ev} />)}
      </div>
    </div>
  );
}
