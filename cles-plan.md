# AI Coding Prompt Blueprint — CLES (Cognitive Load Estimation System)

## 1) Project Overview
- **App Name:** CLES (Cognitive Load Estimation System)
- **Core Goal:** A browser-based app that estimates students’ cognitive load while solving **10-question** tasks in **Data Structures**. It combines **webcam attention proxies** and **heart-rate signals**, offers an optional **Support** mode (hints/encouragement/rest nudges), and produces **detailed reports** (overall load per question, intrinsic/extraneous/germane breakdown, score, event timeline, PDF export).
- **Primary Users**
  - **Student:** Explore subtopics, complete a brief profile (prior knowledge/experience/interests), pick a subtopic, run tasks in **Support** or **No-Support** (from **Settings**), view/download reports, browse history.
  - **Instructor/Admin:** Manage Data Structures question bank (subtopics, difficulty, hints/examples), review student reports.
- **Defaults & Constraints**
  - **Web app** (desktop & mobile browsers).
  - Scope v1: **Data Structures** (Array, Linked List, Stack, Queue, Tree, Sorting).
  - **Fixed 10 questions** per session.
  - **Profile is required before starting**, but users **can explore first**.
  - **Mode is user-selected** in **Settings** (Support / No-Support), **no randomization**.

---

## 2) Step-by-Step Module Breakdown

### A) Auth & Public Access
**Features**
- Email + password sign up/in; password reset.
- Public **Welcome** page; task/report features require login.

**Flow**
1) Visitor → Welcome → Sign up / Sign in  
2) After login → **Home** (Subtopics + History)

---

### B) Home (Post-Login Landing)
**UI Blocks**
- **Subtopics Grid** (Array, Linked List, Stack, Queue, Tree, Sorting): each card shows name, short blurb, “10 Q”, estimated time, **Details**, **Start**.
- **Recent Reports** list: date, subtopic, mode (Support/No-Support), score, average load → **View**.

**Rules**
- Free exploration always allowed.  
- If `profile.completed == false`:
  - Show **non-blocking yellow info bar**: “Complete your profile before starting.” + **Go to Profile**.
  - **Start** button on subtopic cards is **disabled** with tooltip: “Complete profile first”.

**Pseudo**
```pseudo
StartButton.enabled = user.profile.completed
if !user.profile.completed: showInfoBanner("Complete your profile before starting.")
```

---

### C) Profile (Required Before Start)
**Purpose:** Capture prior knowledge/experience/interests for context and better insights.

**Fields**
- Prior knowledge self-rating (1–5) per subtopic.
- Experience (course/project done? yes/no + brief note).
- Interest subtopics (multi-select).
- Optional basics (program/year).

**Behaviors**
- Save → set `profile.completed = true`.
- If opened with `?return=...`, redirect back after save.

**Pseudo**
```pseudo
onSaveProfile():
  profile.completed = true
  if query.return: navigate(query.return)
```

---

### D) Settings (Global Mode Selection)
**Features**
- Radio: **Support** | **No-Support**.
- Persist per user; applied to all sessions until changed.
- Task pages **read-only display** the current mode.

**Pseudo**
```pseudo
mode = user.settings.mode  // 'support' | 'no_support'
```

---

### E) Subtopic Details → Start Preparation (Guarded)
**Flow**
1) From Home → **Subtopic Details** (`/subtopics/:id`): show subtopic summary, **10-question** format, estimated time, and **Mode: Support/No-Support** (read-only, from Settings).  
2) **Start Preparation** CTA:
   - If `!profile.completed`: open **blocking modal** → “Finish profile first” (jump to `/profile?return=/subtopics/:id`).
   - Else → proceed to **Calibration**.

**Route Guard (double safety)**
```pseudo
onEnter('/calibration'):
  if !user.profile.completed: redirect('/profile?return=/calibration&subtopic=:id')
```

---

### F) Calibration (Device Readiness)
**Layout**
- Left: checklist (posture, lighting, sensor placement).
- Center: **webcam preview** with face/gaze status badges.
- Right: **heart-rate mini chart** (10 s) + countdown.

**Pass Conditions (example)**
- Face detected/stable ≥ 8 s (FPS ≥ 15).
- HR signal variance within band ≥ 8 s.

**Outputs**
- Baselines for attention & HR (for normalization).
- Enable **Start Task** only after pass.

---

### G) Session (10 Questions, per chosen subtopic)
**Shared Mechanics**
- Single-question view with **timer** and **progress** (X/10).
- Continuous capture: **attention proxies** (webcam) + **heart-rate stream** + **user actions** (open hint, submit, skip, warnings).
- Scoring: correct answer → base points; **Support** mode may apply small hint penalty.

**Mode Differences**
- **Support:** enable **Hint/Example**; show **encouragement** and **rest nudges** when load high; positive reinforcement when load low.
- **No-Support:** hints/examples **hidden**; **no learning nudges** (only technical alerts such as device loss).

**Realtime Logic (examples)**
```pseudo
// attention proxy per frame
att_t = 1.0
if !face_detected: att_t -= 0.5
if gaze_offscreen: att_t -= 0.3
if head_yaw > th:  att_t -= 0.2
att_t = clamp(att_t, 0, 1)

// HR normalization vs baseline
hr_t = norm(HR_t, baselineHR, baselineHR-10, baselineHR+30)

// overall load per frame
overall_t = w1*hr_t + w2*(1 - att_t) + w3*extraneous_t + w4*difficulty_q

// Support-mode prompts
if mode=='support':
  if overall_t > HIGH_TH: toast("Consider a 30s break or try next question?")
  if overall_t < LOW_TH:  toast("Great focus—keep it up!")
```

**Per-Question Aggregation**
```pseudo
intrinsic_q  = mapDifficulty0_1(question.difficulty)
extraneous_q = weighted(offscreen_rate_q, time_pressure_events_q, context_switches_q, alerts_q)
germane_q    = clamp(attention_avg_q * (1 - hint_dependency_q) * active_solving_ratio_q, 0, 1)
overall_q    = EMA(overall_t over question duration)
score_q      = correctness ? (base_points - hint_penalty) : 0
```

---

### H) Report & History
**Report (per session)**
- **Overview card:** date/time, subtopic, mode, score, total time, average load level.
- **Chart 1:** overall load per question (line).
- **Chart 2:** intrinsic vs extraneous vs germane per question (stacked bars).
- **Timeline:** key events (hint opened, rest suggestion shown, time warnings, question switches, device alerts).
- **Narrative insights:** concise analysis tied to prior knowledge & session signals.
- **Export:** **PDF**.

**History**
- List with filters (date, subtopic, mode); click → open report.

**Insight Rules (examples)**
```pseudo
if avg_intrinsic>0.7 && prior_knowledge_low:
  advice += "Revisit core concepts and worked examples before next attempt."
if avg_extraneous>0.6:
  advice += "Reduce interruptions and manage time pressure to lower extraneous load."
if avg_germane<0.4 && hints_used_high:
  advice += "Try independent reasoning before opening hints to strengthen schema-building."
```

---

### I) Admin — Question Bank
**Views**
- **Subtopics** list → **Questions** table: prompt, difficulty (1–5), type (MCQ/short/code), options, answer key, hint, example, enabled.
- **Bulk Add/Edit** for a subtopic with mixed difficulties.
- **Preview** a question before enabling.

**Rules**
- Validate required fields (prompt, difficulty, answer key).
- Optional flag: “Show example only in Support mode”.

---

## 3) Priority Order (MVP → Phases)

**MVP (Phase 1)**
1. Auth (email/password), Welcome, Header/Nav.
2. Home (Subtopics grid + History list + non-blocking profile banner).
3. Profile page (required only before starting; with `return` redirect).
4. Settings (Support/No-Support).
5. Subtopic Details + **guarded** Start Preparation.
6. Calibration (webcam preview + 10 s HR; allow mock HR initially).
7. Session basics (10 Q; correctness/score; save session & history).
8. Report v1 (score + **overall load per question** with mock load) + PDF placeholder.

**Phase 2**
9. Live heart-rate & attention proxies; full Support vs No-Support behaviors.
10. Report v2 (three-load breakdown + timeline) + finalized PDF export.
11. Admin Question Bank (subtopics, difficulty, hints/examples, bulk add).

**Phase 3**
12. History filters/compare, adaptive thresholds via calibration.
13. Data export (CSV) for research; extend to more subtopics.

---

## 4) UI Design (Pages & Components)

1. **Welcome**  
   - Nav: Logo, Home, Features, About, right-aligned Sign In / Sign Up  
   - Hero title + subtitle + “Get Started Free” CTA  
   - Benefits cards (Realtime nudges / Insightful reports / Simple workflow)  
   - Footer with minimal links

2. **Auth**  
   - Split layout: left image/quote, right form (email/password)  
   - Links: Forgot password, Create account

3. **Home**  
   - **Info banner** (only if profile incomplete): link to Profile  
   - **Subtopics grid** (Details / Start; Start disabled until profile complete)  
   - **History list** (date, subtopic, mode, score, avg load → View)

4. **Profile**  
   - Progress header (“3/4 complete”)  
   - Sections: Prior Knowledge ratings; Experience; Interests  
   - Save → toast success; redirect if `return` present

5. **Settings**  
   - Card: Practice Mode → **Support / No-Support** (radio + short description)  
   - Save → “Applied to future sessions” toast

6. **Subtopic Details**  
   - Summary, rules (10 Q, timed), read-only “Mode: Support/No-Support”  
   - Primary CTA: **Start Preparation** (guarded by profile)

7. **Calibration**  
   - Three columns: Checklist | Webcam preview (face/gaze badges) | 10 s HR sparkline + countdown  
   - “Start Task” only enabled when calibration passes

8. **Session**  
   - Top: subtopic name, timer, progress X/10  
   - Center: question card (prompt/media/answer UI)  
   - Right **(Support only)**: Hint/Example + encouragement area  
   - Toast area for nudges/alerts; Submit/Next controls

9. **Report**  
   - Overview card → Chart 1 (overall per Q) → Chart 2 (three-load per Q) → Timeline → Narrative insights  
   - Buttons: **Download PDF**, **Back to Home**

10. **Admin (Question Bank)**  
    - Subtopic list → question table  
    - Bulk add modal; preview; enable/disable

---

## 5) Technology Stack Selection (with Rationale)

- **Frontend:** **Next.js + React + Tailwind CSS + Zustand (or Redux Toolkit) + Recharts/Chart.js**  
  *Why:* fast development, clean routing, responsive UI, robust charting, simple state management.  
  **Webcam/Attention:** **MediaPipe / TensorFlow.js** client-side for face/gaze proxies.

- **Backend:** **Node.js** (Next.js Route Handlers or Express)  
  *Why:* one language end-to-end; straightforward endpoints for sessions, reports, and heart-rate relay.

- **Database & Auth:** **PostgreSQL** (hosted via **Supabase**)  
  *Why:* solid relational model for users/questions/sessions; built-in email/password auth; optional storage.

- **Realtime Heart-Rate Ingest (choose one):**  
  1) **ESP32 → HTTPS → Backend**, then backend → browser via **WebSocket/SSE**.  
  2) ESP32 → small **WebSocket gateway** by session ID; client subscribes.  
  *Reason:* browser compatibility and reliability (no dependency on Web Serial/BLE).

- **PDF Export:** Client-side **html2pdf** (quick) or server-side **Puppeteer** (print-perfect).

- **Deployment:** **Vercel** (Next.js app + serverless routes) + **Supabase** (DB/Auth).  
  Alternative: Render/Railway for a dedicated Node API.

---

## 6) Suggested Data Model

**users**  
- id, email, password_hash, created_at  
- settings_mode: enum('support','no_support') default 'support'  
- profile_completed: boolean  
- profile_prior_knowledge: JSON (subtopic→1..5)  
- profile_experience_note: text  
- profile_interest_subtopics: string[]

**subtopics**  
- id, name ('Array','Linked List','Stack','Queue','Tree','Sorting'), description, enabled

**questions**  
- id, subtopic_id (FK), difficulty (1..5), prompt, type ('mcq','short','code'), options JSON, answer_key JSON  
- hint text, example text, enabled boolean

**sessions**  
- id, user_id, subtopic_id, mode enum('support','no_support'), started_at, ended_at, duration_ms  
- calibration JSON {hrBaseline, attentionBaseline}  
- score_total int, avg_overall_load float, avg_intrinsic float, avg_extraneous float, avg_germane float

**responses**  
- id, session_id, question_id, index (1..10), user_answer JSON, correct boolean, time_ms, hints_used int  
- metrics JSON (overall_q, intrinsic_q, extraneous_q, germane_q)

**events**  
- id, session_id, ts_ms, type ('hint_open','rest_suggest','time_warning','device_alert','question_next',...)  
- payload JSON

---

## 7) API Endpoints (Illustrative)

- **Auth:** `POST /auth/signup`, `POST /auth/login`, `POST /auth/reset`  
- **User:** `GET /me`, `PUT /me/profile`, `PUT /me/settings`  
- **Subtopics:** `GET /subtopics`, `GET /subtopics/:id`  
- **Sessions:**  
  - `POST /sessions` (create; copies mode from user settings; binds subtopic)  
  - `POST /sessions/:id/calibration` (save baselines)  
  - **Realtime:** `WS /sessions/:id/stream` (HR/alerts → client)  
  - `POST /sessions/:id/responses` (per question or batch)  
  - `POST /sessions/:id/finish` (finalize & compute aggregates)  
- **Reports:** `GET /reports/:sessionId`, `GET /reports/:sessionId/pdf`  
- **Admin:** `GET/POST/PUT /admin/questions`, `POST /admin/questions/bulk`

---

## 8) Acceptance Criteria (MVP)

1. User can log in and see **Home** with **Subtopics** and **History**.  
2. If profile is incomplete: user can explore, but **Start** is disabled; **Start Preparation** shows blocking modal; **Calibration** route guard redirects to **Profile**.  
3. **Settings** toggles Support/No-Support; **Subtopic Details** displays the current mode (read-only).  
4. **Calibration** shows webcam preview and **10 s** HR chart; **Start Task** only after passing.  
5. Completing a **10-question** session saves score and generates a report with **overall load per question** (mock acceptable in MVP).  
6. Report opens from **History**; **PDF** produces overview + Chart 1.  
7. Admin can add questions to a subtopic; sessions fetch 10 items from the chosen subtopic.

---

## 9) Dev Notes & Heuristics

- **Load computation** is heuristic initially; expose configurable weights/thresholds:  
  `w1..w4`, `HIGH_TH`, `LOW_TH`, smoothing `EMA_alpha`.  
- **Support penalties** for hints/examples should be modest yet visible.  
- **Privacy:** Never store raw video; store derived metrics and timestamps only.  
- **Resilience:** If HR stream drops, show technical alert (both modes), continue with attention-only proxy.  
- **Research clarity:** Each session stores **mode** and **subtopic**; reports display both for clean comparisons.

---

## 10) Example Snippets

**Guard: Start Preparation**
```ts
function handleStartPreparation(subtopicId) {
  if (!user.profile.completed) {
    openModal('Please complete your profile before starting.', {
      primaryAction: () => router.push(`/profile?return=/subtopics/${subtopicId}`),
    });
    return;
  }
  router.push(`/calibration?subtopic=${subtopicId}`);
}
```

**Mode (Settings)**
```ts
// save
await api.put('/me/settings', { mode });
// use
const mode = me.settings_mode; // 'support' | 'no_support'
```

**Per-Question Aggregation**
```ts
overall_q = ema(overall_t_stream, 0.2);
germane_q = clamp(att_avg_q * (1 - hints_used_q/hints_avail_q) * active_ratio_q, 0, 1);
```

