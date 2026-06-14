import { useState, useEffect, useRef } from "react";
import Plot from "react-plotly.js";

const API = "http://localhost:8000";

const COLOR = {
  bg: "#080D14",
  panel: "#0B1320",
  border: "#1A2740",
  borderBright: "#2A4060",
  critical: "#FF3B30",
  criticalDim: "rgba(255,59,48,0.12)",
  warning: "#FF9F0A",
  warningDim: "rgba(255,159,10,0.12)",
  low: "#34C759",
  lowDim: "rgba(52,199,89,0.12)",
  accent: "#0A84FF",
  accentDim: "rgba(10,132,255,0.12)",
  text: "#E8F0FF",
  textDim: "#6B8AAA",
  textMid: "#A0B8D0",
};

const IMPACT_COLOR = {
  CRITICAL: COLOR.critical,
  HIGH: COLOR.critical,
  MEDIUM: COLOR.warning,
  LOW: COLOR.low,
  NOMINAL: COLOR.low,
};

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ── Globe ──────────────────────────────────────────────────────────────────
function Globe({ satellites }) {
  const traces = [];

  // Earth surface
  traces.push({
    type: "surface",
    colorscale: [
      [0, "#0B1F3A"], [0.3, "#0D2B4E"], [0.5, "#0F3460"],
      [0.7, "#1A4A7A"], [1, "#1E5490"],
    ],
    showscale: false,
    opacity: 0.95,
    ...sphereCoords(40),
    hoverinfo: "none",
    lighting: { ambient: 0.6, diffuse: 0.8 },
  });

  // Orbit paths
  const orbitColors = ["#0A84FF","#FF9F0A","#34C759","#BF5AF2","#FF375F"];
  satellites.forEach((sat, i) => {
    if (!sat.orbit_lats?.length) return;
    const { x, y, z } = latLonToXYZ(sat.orbit_lats, sat.orbit_lons, 41.2);
    traces.push({
      type: "scatter3d", mode: "lines",
      x, y, z,
      line: { color: orbitColors[i % orbitColors.length], width: 1.5, dash: "dot" },
      opacity: 0.5,
      hoverinfo: "none",
      showlegend: false,
    });
  });

  // Satellite dots
  satellites.forEach((sat, i) => {
    const { x, y, z } = latLonToXYZ([sat.lat], [sat.lon], 41.8);
    traces.push({
      type: "scatter3d", mode: "markers+text",
      x, y, z,
      marker: { size: 5, color: orbitColors[i % orbitColors.length], symbol: "diamond" },
      text: [sat.name.replace("CARTOSAT","CARTO").replace("RESOURCESAT","RSAT").replace("OCEANSAT","OSAT")],
      textposition: "top center",
      textfont: { size: 9, color: orbitColors[i % orbitColors.length] },
      hovertemplate: `<b>${sat.name}</b><br>Alt: ${sat.alt_km} km<br>Lat: ${sat.lat?.toFixed(1)}° Lon: ${sat.lon?.toFixed(1)}°<extra></extra>`,
      showlegend: false,
    });
  });

  return (
    <Plot
      data={traces}
      layout={{
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        margin: { l: 0, r: 0, t: 0, b: 0 },
        scene: {
          bgcolor: "transparent",
          xaxis: { visible: false, showgrid: false },
          yaxis: { visible: false, showgrid: false },
          zaxis: { visible: false, showgrid: false },
          camera: { eye: { x: 1.5, y: 1.5, z: 1.0 } },
          aspectmode: "cube",
        },
        uirevision: "globe",
      }}
      config={{ displayModeBar: false, scrollZoom: true }}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

function sphereCoords(r) {
  const N = 40;
  const z = [], x = [], y = [];
  for (let i = 0; i <= N; i++) {
    const lat = -90 + (180 * i) / N;
    const zRow = [], xRow = [], yRow = [];
    for (let j = 0; j <= N; j++) {
      const lon = -180 + (360 * j) / N;
      const φ = (lat * Math.PI) / 180;
      const λ = (lon * Math.PI) / 180;
      xRow.push(r * Math.cos(φ) * Math.cos(λ));
      yRow.push(r * Math.cos(φ) * Math.sin(λ));
      zRow.push(r * Math.sin(φ));
    }
    x.push(xRow); y.push(yRow); z.push(zRow);
  }
  return { x, y, z };
}

function latLonToXYZ(lats, lons, r) {
  const x = [], y = [], z = [];
  lats.forEach((lat, i) => {
    const φ = (lat * Math.PI) / 180;
    const λ = (lons[i] * Math.PI) / 180;
    x.push(r * Math.cos(φ) * Math.cos(λ));
    y.push(r * Math.cos(φ) * Math.sin(λ));
    z.push(r * Math.sin(φ));
  });
  return { x, y, z };
}

// ── Countdown ──────────────────────────────────────────────────────────────
function Countdown({ minutes, color }) {
  const [secs, setSecs] = useState(minutes * 60);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return (
    <span style={{ color, fontFamily: "monospace", fontWeight: 700, fontSize: 15 }}>
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

// ── Alert Card ─────────────────────────────────────────────────────────────
function AlertCard({ alert, selected, onClick }) {
  const c = alert.mission_impact === "HIGH" || alert.mission_impact === "CRITICAL"
    ? COLOR.critical : alert.mission_impact === "MEDIUM" ? COLOR.warning : COLOR.low;
  const dim = alert.mission_impact === "HIGH" || alert.mission_impact === "CRITICAL"
    ? COLOR.criticalDim : alert.mission_impact === "MEDIUM" ? COLOR.warningDim : COLOR.lowDim;

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? dim : "transparent",
        border: `1px solid ${selected ? c : COLOR.border}`,
        borderLeft: `3px solid ${c}`,
        borderRadius: 8,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{alert.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: c, letterSpacing: "0.06em" }}>
              {alert.type}
            </span>
          </div>
          <div style={{ fontSize: 12, color: COLOR.textMid, marginBottom: 2 }}>
            {alert.satellite}
          </div>
          <div style={{ fontSize: 11, color: COLOR.textDim }}>{alert.detail}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px",
            borderRadius: 10, background: dim, color: c,
            border: `1px solid ${c}`, marginBottom: 6,
          }}>{alert.mission_impact}</div>
          <Countdown minutes={alert.time_remaining_min} color={c} />
        </div>
      </div>
    </div>
  );
}

// ── Reasoning Panel ────────────────────────────────────────────────────────
function ReasoningPanel({ alert, startTime }) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    setVisibleSteps(0);
    const steps = alert.reasoning_steps || [];
    steps.forEach((step, i) => {
      setTimeout(() => {
        setVisibleSteps(i + 1);
      }, step.time_offset + i * 200);
    });
  }, [alert.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleSteps]);

  const c = IMPACT_COLOR[alert.mission_impact] || COLOR.accent;
  const steps = alert.reasoning_steps || [];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${COLOR.border}`,
        display: "flex", alignItems: "center", gap: 8
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: COLOR.low,
          boxShadow: `0 0 6px ${COLOR.low}`,
          animation: "pulse 1.5s infinite"
        }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: COLOR.textDim, letterSpacing: "0.07em" }}>
          AGENT REASONING — {alert.type}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {steps.slice(0, visibleSteps).map((step, i) => {
          const t = new Date(startTime.getTime() + step.time_offset * 1000 + i * 200);
          const timeStr = t.toTimeString().slice(0, 8);
          const isLast = i === steps.length - 1;
          return (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, opacity: 1,
              animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: isLast ? c : COLOR.borderBright,
                  border: `1px solid ${isLast ? c : COLOR.borderBright}`,
                  boxShadow: isLast ? `0 0 8px ${c}` : "none",
                  marginTop: 3,
                }} />
                {i < steps.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: COLOR.border, marginTop: 4 }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ fontSize: 10, color: COLOR.textDim, fontFamily: "monospace", marginBottom: 3 }}>
                  {timeStr}
                </div>
                <div style={{
                  fontSize: 13, color: isLast ? c : COLOR.textMid,
                  fontWeight: isLast ? 600 : 400, lineHeight: 1.5,
                }}>
                  {step.msg}
                </div>
              </div>
            </div>
          );
        })}
        {visibleSteps < steps.length && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLOR.textDim, fontSize: 12 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: "50%", background: COLOR.accent,
                  animation: `blink 1s ${i*0.2}s infinite`
                }} />
              ))}
            </div>
            Analyzing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Recommended Action */}
      <div style={{
        padding: "12px 14px",
        borderTop: `1px solid ${COLOR.border}`,
        background: `${c}10`,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: "0.06em", marginBottom: 6 }}>
          RECOMMENDED ACTION
        </div>
        <div style={{ fontSize: 12, color: COLOR.text, lineHeight: 1.6 }}>
          {alert.recommended_action}
        </div>
      </div>
    </div>
  );
}

// ── Mission Impact Panel ───────────────────────────────────────────────────
function MissionImpactPanel({ alert }) {
  const riskColor = (r) => IMPACT_COLOR[r] || COLOR.textDim;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${COLOR.border}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: COLOR.textDim, letterSpacing: "0.07em" }}>
          MISSION IMPACT ANALYSIS
        </span>
      </div>

      <div style={{ padding: "14px", flex: 1 }}>
        {/* Risk states */}
        {[
          { label: "Current Risk", value: alert.current_risk },
          { label: "If Actioned Now", value: alert.if_actioned, suffix: "✅" },
          { label: "If Ignored", value: alert.if_ignored, suffix: "⚠️" },
        ].map(({ label, value, suffix }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 12px", marginBottom: 6,
            background: `${riskColor(value)}10`,
            border: `1px solid ${riskColor(value)}30`,
            borderRadius: 7,
          }}>
            <span style={{ fontSize: 12, color: COLOR.textMid }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: riskColor(value) }}>
              {suffix && <span style={{ marginRight: 5 }}>{suffix}</span>}
              {value}
            </span>
          </div>
        ))}

        {/* Consequences */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLOR.textDim, letterSpacing: "0.06em", marginBottom: 10 }}>
            OPERATIONAL CONSEQUENCES
          </div>
          {(alert.consequences || []).map((c, i) => (
            <div key={i} style={{
              display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start"
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: IMPACT_COLOR[alert.mission_impact] || COLOR.textDim,
                flexShrink: 0, marginTop: 5,
              }} />
              <span style={{ fontSize: 12, color: COLOR.textMid, lineHeight: 1.5 }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────
function Timeline({ alerts, now }) {
  const events = [
    { label: alerts[0]?.type || "COMMS WINDOW", min: alerts[0]?.time_remaining_min || 18, color: COLOR.critical },
    { label: alerts[1]?.type || "CONJUNCTION", min: alerts[1]?.time_remaining_min || 263, color: COLOR.warning },
    { label: alerts[2]?.type || "BATTERY", min: alerts[2]?.time_remaining_min || 360, color: COLOR.low },
  ];
  const maxMin = 420;

  return (
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: COLOR.textDim, letterSpacing: "0.07em", marginBottom: 10 }}>
        MISSION TIMELINE
      </div>
      <div style={{ position: "relative" }}>
        {/* Track */}
        <div style={{
          position: "absolute", top: 12, left: 60, right: 0,
          height: 1, background: COLOR.border,
        }} />
        {/* NOW marker */}
        <div style={{
          position: "absolute", top: 4, left: 60,
          fontSize: 9, color: COLOR.accent, fontWeight: 700, letterSpacing: "0.05em"
        }}>NOW</div>

        {events.map((ev, i) => {
          const pct = Math.min(98, (ev.min / maxMin) * 100);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 14, position: "relative" }}>
              <div style={{ width: 55, fontSize: 10, color: COLOR.textDim, flexShrink: 0, lineHeight: 1.3 }}>
                {ev.min >= 60
                  ? `${Math.floor(ev.min/60)}h ${ev.min%60}m`
                  : `${ev.min}m`}
              </div>
              <div style={{ flex: 1, position: "relative", height: 24 }}>
                <div style={{
                  position: "absolute", left: `${pct}%`,
                  display: "flex", flexDirection: "column", alignItems: "center",
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: ev.color, boxShadow: `0 0 8px ${ev.color}`,
                    border: `2px solid ${COLOR.bg}`,
                  }} />
                  <div style={{
                    fontSize: 9, color: ev.color, fontWeight: 700,
                    whiteSpace: "nowrap", marginTop: 3, letterSpacing: "0.03em"
                  }}>{ev.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────
function Header({ summary, now }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0 20px", height: 52,
      borderBottom: `1px solid ${COLOR.border}`,
      background: COLOR.panel,
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: `${COLOR.accent}20`,
            border: `1px solid ${COLOR.accent}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>🛰</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.text, letterSpacing: "0.05em" }}>
              MISSIONGUARD
            </div>
            <div style={{ fontSize: 9, color: COLOR.textDim, letterSpacing: "0.08em" }}>
              AI MISSION OPERATIONS COPILOT
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 28, background: COLOR.border }} />

        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "SATELLITES", value: "5 ACTIVE" },
            { label: "ALERTS", value: summary?.total_alerts || 3 },
            { label: "STATUS", value: summary?.overall_status || "MONITORING",
              color: summary?.overall_status === "CRITICAL" ? COLOR.critical : COLOR.low },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize: 9, color: COLOR.textDim, letterSpacing: "0.07em" }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: color || COLOR.text }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: COLOR.textDim, letterSpacing: "0.07em" }}>UTC</div>
          <div style={{ fontSize: 13, fontFamily: "monospace", color: COLOR.text, fontWeight: 600 }}>
            {now.toUTCString().slice(17, 25)}
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 20,
          background: `${COLOR.low}15`,
          border: `1px solid ${COLOR.low}40`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: COLOR.low, animation: "pulse 2s infinite"
          }} />
          <span style={{ fontSize: 10, color: COLOR.low, fontWeight: 700 }}>LIVE</span>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [satellites, setSatellites] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const startTime = useRef(new Date());
  const now = useNow();

  useEffect(() => {
    Promise.all([
      fetch(`${API}/satellites`).then(r => r.json()),
      fetch(`${API}/alerts`).then(r => r.json()),
    ]).then(([satData, alertData]) => {
      setSatellites(satData.satellites || []);
      setAlerts(alertData.alerts || []);
      setSummary(alertData.summary || null);
      setSelectedAlert(alertData.alerts?.[0] || null);
      setLoading(false);
    }).catch(() => {
      // Use mock data if backend not running
      const mockAlerts = getMockAlerts();
      setAlerts(mockAlerts);
      setSummary({ total_alerts: 3, critical_count: 1, overall_status: "CRITICAL" });
      setSelectedAlert(mockAlerts[0]);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{
      background: COLOR.bg, height: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
    }}>
      <div style={{ fontSize: 20, color: COLOR.accent }}>🛰</div>
      <div style={{ fontSize: 13, color: COLOR.textDim, letterSpacing: "0.1em" }}>
        INITIALIZING MISSIONGUARD...
      </div>
      <div style={{ fontSize: 11, color: COLOR.textDim }}>Fetching live TLE data from CelesTrak</div>
    </div>
  );

  return (
    <div style={{
      background: COLOR.bg, height: "100vh", display: "flex",
      flexDirection: "column", color: COLOR.text,
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLOR.borderBright}; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      <Header summary={summary} now={now} />

      {/* Main grid */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "1.8fr 280px 320px",
        gridTemplateRows: "1fr 120px",
        gap: 0, overflow: "hidden",
        borderTop: `1px solid ${COLOR.border}`,
      }}>
        {/* Globe */}
        <div style={{
          gridRow: "1 / 2", gridColumn: "1 / 2",
          background: COLOR.bg,
          position: "relative",
          borderRight: `1px solid ${COLOR.border}`,
        }}>
          <div style={{
            position: "absolute", top: 10, left: 14, zIndex: 10,
            fontSize: 9, fontWeight: 700, color: COLOR.textDim, letterSpacing: "0.08em"
          }}>
            ORBITAL VIEW — REAL TLE DATA
</div>

<div style={{
    position: "absolute",
    top: 10,
    right: 14,
    zIndex: 10,
    fontSize: 10,
    color: "#34C759",
    border: "1px solid #34C759",
    padding: "3px 8px",
    borderRadius: 6
}}>
    LIVE: CelesTrak + Skyfield
</div>

<div style={{
    position: "absolute", top: 24, left: 14, zIndex: 10,
    display: "flex", flexDirection: "column", gap: 3,
}}>
           
           
            {satellites.slice(0, 5).map((sat, i) => {
              const c = ["#0A84FF","#FF9F0A","#34C759","#BF5AF2","#FF375F"][i];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 10, color: COLOR.textMid }}>{sat.name}</span>
                </div>
              );
            })}
          </div>
          {satellites.length > 0 ? (
            <Globe satellites={satellites} />
          ) : (
            <div style={{
              height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column", gap: 12,
            }}>
              <div style={{ fontSize: 40 }}>🌍</div>
              <div style={{ fontSize: 12, color: COLOR.textDim }}>Globe renders with backend running</div>
              <div style={{ fontSize: 11, color: COLOR.textDim }}>Start backend: uvicorn main:app</div>
            </div>
          )}
        </div>

        {/* Alerts Panel */}
        <div style={{
          gridRow: "1 / 2", gridColumn: "2 / 3",
          borderRight: `1px solid ${COLOR.border}`,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 14px", borderBottom: `1px solid ${COLOR.border}`,
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.textDim, letterSpacing: "0.07em" }}>
              ACTIVE ALERTS
            </div>
            <div style={{
  fontSize: 11,
  color: COLOR.textDim,
  marginTop: 4
}}>
  MissionGuard analyzed 5 satellites and identified 3 operational alerts.
</div>

<div style={{ fontSize: 11, color: COLOR.textMid, marginTop: 2 }}>
  {summary?.critical_count || 1} require{summary?.critical_count === 1 ? "s" : ""} immediate attention
</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                selected={selectedAlert?.id === alert.id}
                onClick={() => {
                  setSelectedAlert(alert);
                  startTime.current = new Date();
                }}
              />
            ))}
          </div>
        </div>

        {/* Right column — reasoning + impact */}
        <div style={{
          gridRow: "1 / 2", gridColumn: "3 / 4",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {selectedAlert && (
            <>
              {/* Reasoning — top 60% */}
              <div style={{
                flex: "0 0 60%", borderBottom: `1px solid ${COLOR.border}`,
                overflow: "hidden", display: "flex", flexDirection: "column",
              }}>
                <ReasoningPanel alert={selectedAlert} startTime={startTime.current} />
              </div>
              {/* Mission Impact — bottom 40% */}
              <div style={{ flex: "0 0 40%", overflow: "hidden" }}>
                <MissionImpactPanel alert={selectedAlert} />
              </div>
            </>
          )}
        </div>

        {/* Timeline — bottom row */}
        <div style={{
          gridRow: "2 / 3", gridColumn: "1 / 4",
          borderTop: `1px solid ${COLOR.border}`,
          background: COLOR.panel,
          padding: "12px 16px",
          display: "flex", alignItems: "center",
        }}>
          <Timeline alerts={alerts} now={now} />
        </div>
      </div>
    </div>
  );
}

function getMockAlerts() {
  return [
    {
      id: "comms_001", type: "COMMUNICATION WINDOW", satellite: "CARTOSAT-3",
      icon: "📡", color: "critical", time_remaining_min: 18, mission_impact: "HIGH",
      detail: "Ground station visibility ending at ISTRAC Bengaluru",
      current_risk: "HIGH", if_actioned: "LOW", if_ignored: "CRITICAL",
      consequences: ["Communication blackout begins","Next contact: +8h 14m","Command upload delayed","Conjunction review blocked"],
      recommended_action: "Upload command sequence immediately. Initiate data downlink.",
      reasoning_steps: [
        {time_offset:0, msg:"Communication window alert received"},
        {time_offset:600, msg:"Checking ground station visibility..."},
        {time_offset:1200, msg:"ISTRAC Bengaluru — visibility ends in 18 minutes"},
        {time_offset:1800, msg:"Evaluating consequence of missed window..."},
        {time_offset:2400, msg:"Next opportunity: +8h 14m from now"},
        {time_offset:3000, msg:"Conjunction review upload depends on this window"},
        {time_offset:3600, msg:"Escalating to CRITICAL"},
        {time_offset:4200, msg:"Recommended: Upload command sequence NOW"},
      ]
    },
    {
      id: "conjunction_001", type: "CONJUNCTION ALERT", satellite: "EOS-04",
      icon: "⚠️", color: "warning", time_remaining_min: 263, mission_impact: "MEDIUM",
      detail: "Debris object 2023-045C — Miss Distance: 847m",
      current_risk: "MEDIUM", if_actioned: "LOW", if_ignored: "HIGH",
      consequences: ["Closest approach in 4h 23m","Miss distance: 847m","Planning review needed","No immediate action required"],
      recommended_action: "Flag for mission planning review within 2 hours.",
      reasoning_steps: [
        {time_offset:0, msg:"Conjunction alert received"},
        {time_offset:600, msg:"Retrieving debris parameters..."},
        {time_offset:1200, msg:"Object: 2023-045C — Miss Distance: 847m"},
        {time_offset:1800, msg:"Time to closest approach: 4h 23m"},
        {time_offset:2400, msg:"Miss distance above 500m threshold — not immediately critical"},
        {time_offset:3000, msg:"Planning review required before T-48h"},
        {time_offset:3600, msg:"Priority: MEDIUM — action within 2 hours"},
      ]
    },
    {
      id: "battery_001", type: "BATTERY ALERT", satellite: "RESOURCESAT-2A",
      icon: "🔋", color: "low", time_remaining_min: 360, mission_impact: "LOW",
      detail: "State of charge at 34% — approaching threshold",
      current_risk: "LOW", if_actioned: "LOW", if_ignored: "MEDIUM",
      consequences: ["Battery threshold in 6 hours","Payload ops may suspend","Safe mode possible if unaddressed","No immediate risk"],
      recommended_action: "Monitor discharge rate. Schedule non-critical ops during next eclipse exit.",
      reasoning_steps: [
        {time_offset:0, msg:"Battery state-of-charge alert triggered"},
        {time_offset:600, msg:"Current SOC: 34% — threshold at 25%"},
        {time_offset:1200, msg:"Discharge rate: nominal for current orbit phase"},
        {time_offset:1800, msg:"Time to threshold: approximately 6 hours"},
        {time_offset:2400, msg:"Next eclipse exit in 47 minutes — recharge expected"},
        {time_offset:3000, msg:"No immediate action required"},
        {time_offset:3600, msg:"Priority: LOW — monitor for 2 orbits"},
      ]
    }
  ];
}