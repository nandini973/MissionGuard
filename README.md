# MissionGuard AI
### Human-in-the-Loop Space Operations Copilot

---

## Run in 5 minutes

### Terminal 1 — Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Backend runs at: http://localhost:8000

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: http://localhost:3000

---

## What you'll see

- 🌍 3D Earth with real Indian satellite orbits (live TLE from CelesTrak)
- 📡 3 active alerts: Comms Window / Conjunction / Battery
- 🤖 Agent reasoning streaming live step by step
- 📊 Mission Impact Panel: Current Risk / If Actioned / If Ignored
- ⏱ Mission Timeline at the bottom

---

## Demo script (4 minutes)

**0:00** "This is MissionGuard. These are 5 real Indian satellites — CARTOSAT-3, EOS-04, RESOURCESAT-2A, OCEANSAT-3, RISAT — using live orbital data from CelesTrak right now."

**0:30** Three alerts appear. "MissionGuard has detected 3 simultaneous alerts."

**1:00** Click COMMUNICATION WINDOW alert. Agent reasoning streams. "Watch the agent reason through the consequences — not just 'priority high', but WHY."

**2:00** Point to Mission Impact panel. "If actioned now: LOW risk. If ignored: CRITICAL. Next contact window lost for 8 hours 14 minutes."

**2:30** Click CONJUNCTION alert. New reasoning streams. "Medium priority — needs planning review, but not right now."

**3:00** Point to timeline. "MissionGuard tells engineers what to look at first, why it matters, and what happens if they don't."

**3:30** "Most systems say: something happened. MissionGuard says: here's what to do first, and here's what you lose if you wait."

---

## Verify with Heavens-Above (for judges)
1. Open https://www.heavens-above.com
2. Search CARTOSAT-3
3. Compare position with dashboard
4. Same coordinates = real data ✅

---

## API endpoints
- GET /satellites — live TLE positions
- GET /alerts — prioritized alerts with reasoning
- GET /refresh — re-fetch TLE data