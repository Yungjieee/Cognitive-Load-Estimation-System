# CLES — Sessions Module (Latest Spec) — AI Coding Prompt

> **Purpose:** This is the **authoritative, build-ready prompt** for the CLES **Sessions** experience (Phase 1), updated with all new requirements and hotfixes. Implement with mock HR + mock questions now; keep hooks for real HR and the computational model later.

---

## 0) Scope & Principles

* The user selects a **Subtopic** (Array/Linked List/Stack/Queue/Tree/Sorting) and answers **10 questions** with fixed difficulty/time/points.
* **Webcam and HR** run in **Calibration and throughout Session**. Always show **live webcam preview** and **HR sparkline** during Session.
* **Support vs No-Support** comes from **Settings** (no randomization). Support enables hints, encouragement, rest nudges, and extra-time suggestions; No-Support hides learning aids (technical alerts still allowed).
* **All actions** (stressor banner, hint usage, extra-time, skip, submit, reveal, warnings) are logged to Events and will be **grouped by question** in the report.
* Implement to **not block answering** if streams fail; show small technical banner.

---

## 1) Fixed Rules (Difficulty, Timing, Scoring)

### 1.1 Difficulty & Timing Schedule

* Q1–Q4 → **Easy**: limit **30s** per question, **5 pts** each.
* Q5–Q7 → **Medium**: limit **50s** per question, **10 pts** each.
* Q8–Q9 → **Hard**: limit **70s** per question, **15 pts** each.
* Q10 → **Hard**: limit **70s**, **20 pts**.
* Total = **100 pts**.

### 1.2 Scoring & Penalties

* Correctness awards the base points for that question **minus hint penalties**.
* **Hint Penalty:** −1 **per hint opened** (Support only, max 3 per question; first open counts; hiding does not refund).
* **Extra-Time Penalty:** −2 **per question** when extra time is granted (one grant max per question), deducted from **total score**.
* **Skip:** 0 points. Skipping is **irreversible** for that question.
* Final score = ∑(per-question awarded) − ∑(extra-time penalties).

---

## 2) Calibration (Must open Webcam here)

* On Calibration mount, request `getUserMedia` with `video` (front/user camera), show **live preview**.
* Show a 10s HR sparkline (mock OK) and face-detected status.
* Pass conditions (example): face detected/stable ≥8s; HR variance within band ≥8s.
* Persist baselines (attention, HR) for later normalization.
* On unmount, **stop tracks** to release camera.

---

## 3) Session Layout & Live Panels

### 3.1 Layout

* **Header:** Subtopic • **Q x/10** • **Timer (mm:ss)** • Total Score so far • Small HR bpm label.
* **Main Card:** Type-aware question renderer + answer inputs.
* **Right Panel (persistent):**

  * **Live Webcam preview** (320×240 video element) with optional face box overlay.
  * **HR sparkline** (last 60–90s) + bpm.
  * **Cognitive Load mini-panel:** four values/bars in [0..1]

    * **Overall**, **Intrinsic**, **Extraneous**, **Germane** (mock compute OK; update ~1s cadence).

### 3.2 Timer Behavior

* Timer **starts** when a question loads; **pauses** immediately on **Submit**; **resumes/reset** on Next.
* 10‑second warning triggers at `remaining==10` (toast + card highlight).

---

## 4) Stressor Banners (Extraneous Load)

* Show **one small, dismissible banner per question** at a randomized moment in `[25%, 50%]` of its limit.
* Sample copy pool (rotate):

  * **“99% of students answered this correctly. Can you?”**
  * “This one should be easy. **Don’t overthink it.**”
  * “**Tick‑tock** — others finished in half the time.”
  * “Your instructor is reviewing **timings** on this one.”
* Log `stressor_show` and `stressor_dismiss` events.
* Banner shows in both modes unless a global experiment flag disables it.

---

## 5) Time-Up Modals (Extra Time / Skip)

* On timeout, open a modal with **two actions**:

  1. **Request Extra Time** (Support/No-Support both allowed): applies **−2 total**; grants **+30%** of original limit for this question; one-time per question. Show penalty copy clearly.
  2. **Skip Question**: **irreversible**, awards 0 points; requires **confirmation** (“You cannot return to this question once skipped. Are you sure?”).
* If extra time expires again, either reopen modal (no second grant) or auto-skip/force-submit as incorrect via config flag.

---

## 6) Hints & Encouragement (Support Mode Only)

* Show compact buttons: **Hint 1 (−1)**, **Hint 2 (−1)**, **Hint 3 (−1)**; clicking toggles visibility.
* First open of each hint increments `hintsUsed` by 1 (max 3). Closing a hint does **not** refund.
* Offer **Rest** when attention is missing ≥3s or repeated time warnings: pause timer, darken UI, show **Resume**. Rest duration defaults **60–120s**, can resume early.
* Offer **+Time** chip when remaining ≤10s and no extra time used; clicking opens the Time-Up modal preselected to Extra Time.
* **Encouragement** appears **after submit** (not during answering): short positive line tailored by correctness.

---

## 7) Post-Answer Reveal (Always)

* After **Submit**: pause timer, lock inputs, and show a **Reveal Card** containing:

  * Correct / Incorrect icon.
  * **Correct Answer**.
  * **Explanation** (mock ok; placeholder if missing).
  * **Next** button.
* Per-question awarded points = `max(basePoints - hintsUsed, 0)` if correct; else `0`.

---

## 8) Question Types (Admin-Configurable)

Implement renderers/validators for:

1. **MCQ** (single answer)
2. **Image-MCQ** (prompt with image)
3. **Matching** (map left→right one-to-one)
4. **Reorder** (drag to correct order)
5. **Short Answer** (string/regex)

Minimum JSON shape (example):

```json
{
  "id":"uuid",
  "subtopic_id":"uuid",
  "difficulty":2,
  "qtype":"mcq|image_mcq|matching|reorder|short",
  "prompt":"text or HTML",
  "media": {"imgUrl":"/assets/stack.png"},
  "options":[{"key":"A","text":"..."}],
  "answer_key":{"correct":"C"},
  "hints":["h1","h2","h3"],
  "explanation":"why the answer is C",
  "enabled":true
}
```

---

## 9) Engine — Flow & State (Pseudo)

```pseudo
for qIndex in 1..10:
  config = schedule[qIndex]
  timer.start(config.limit)
  extraUsed=false; hintsUsed=0

  while not submitted and not timedOut:
    renderQuestion()
    renderRightPanel(webcam, hr, loads)
    maybeShowStressor(25..50%)
    if mode==support: maybeSuggestRestOrHint()
    if remaining==10: toast('10 seconds left')

  if timedOut:
    choice = openTimeUpModal()
    if choice=='extra' and !extraUsed:
      totalPenalty += 2
      extraUsed = true
      timer.extend(0.3 * config.limit)
      continue // back to loop
    else if choice=='skip' or secondTimeout:
      if confirmIrreversible(): award=0; save(); goto next

  if submitted:
    award = correctness ? max(config.points - hintsUsed, 0) : 0
    showReveal(correct, correctAnswer, explanation)

  saveResponse(qIndex, award, hintsUsed, timeSpent, events)

next:
  if qIndex == 10: finishSession(); goReport(); else loadNext()
```

---

## 10) Constants (Single Source of Truth)

```ts
export const SCHEDULE = [
  { idx:1,  level:'easy',   limit:30, points:5 },
  { idx:2,  level:'easy',   limit:30, points:5 },
  { idx:3,  level:'easy',   limit:30, points:5 },
  { idx:4,  level:'easy',   limit:30, points:5 },
  { idx:5,  level:'medium', limit:50, points:10 },
  { idx:6,  level:'medium', limit:50, points:10 },
  { idx:7,  level:'medium', limit:50, points:10 },
  { idx:8,  level:'hard',   limit:70, points:15 },
  { idx:9,  level:'hard',   limit:70, points:15 },
  { idx:10, level:'hard',   limit:70, points:20 },
];
export const PENALTY_HINT_PER_USE = 1;     // per hint (question-level)
export const PENALTY_EXTRA_TIME_TOTAL = 2; // per question (total-level)
export const EXTRA_TIME_FACTOR = 0.30;     // +30% of original limit
export const REST_MIN_MS = 60_000;         // 60s (support only)
export const REST_MAX_MS = 120_000;        // 120s (support only)
export const TEN_SECOND_WARNING_AT = 10;   // seconds left
export const STRESSOR_WINDOW = [0.25, 0.50];
```

---

## 11) Live Panels — Implementation Notes

* **Webcam:** `<video autoplay playsinline muted>`; draw face box on `<canvas>` if using a detector.
* **HR:** subscribe to mock or real WS stream; keep a ring buffer for sparkline.
* **Loads (mock):** update once/sec

  * `intrinsic = difficulty/5`
  * `extraneous = 0.2 + 0.5*offscreenRate + (timeWarn?0.2:0)`
  * `germane = clamp(attAvg * (1 - hintsUsed/3), 0, 1)`
  * `overall = EMA(w2*(1-att) + w3*extr + w4*intrinsic)`
* Non-fatal stream failure → small banner only.

---

## 12) Events & Report Grouping

* Persist raw events to DB with timestamps.
* **Report UI** groups by **question** (one card per question) with **counts** instead of spammy timestamps:

  * e.g., Q1: Hints×2, Extra Time×1, Time Warnings×1, Skip×0
* Keep raw timestamps for future analysis but don’t render all of them.

---

## 13) API Surface (used by Session)

* `POST /sessions` → create session (mode copied from user.settings; bind subtopic)
* `GET /questions?subtopicId=...` → array of 10 enabled questions chosen by server
* `POST /sessions/:id/events` → append event
* `POST /sessions/:id/responses` → save per-question result
* `POST /sessions/:id/finish` → finalize & compute total (∑award − ∑extra-time penalties)
* `WS /sessions/:id/stream` → HR samples (mock for now)

---

## 14) Components to Implement

* `TimerController.ts` — start/pause/extend; 10s warning; emits timeout
* `SessionRightPanel.tsx` — webcam preview + HR sparkline + loads mini-panel
* `HintPanel.tsx` — Hint1/2/3 toggle with first-open penalty
* `TimeUpModal.tsx` / `ConfirmModal.tsx` — extra time / irreversible skip
* `RevealCard.tsx` — correctness + correct answer + explanation + Next
* `EventGrouper.ts` — group events by question for report view

---

## 15) QA Checklist (must pass)

* [ ] Webcam opens in **Calibration**; stops on unmount; also visible live in **Session** right panel.
* [ ] HR sparkline visible in Session; mock feed OK.
* [ ] Timer **pauses** immediately on Submit; resumes/reset on Next.
* [ ] Post-submit **Reveal Card** shows correct answer + explanation (mock OK).
* [ ] **Hints**: up to 3; first open deducts **−1** each; can hide; no refund.
* [ ] **10s** warning reliably triggers.
* [ ] **Time-Up Modal** offers Extra Time (−2) or Skip (0) with confirmation; one extra-time grant max.
* [ ] Skip on last question still **finishes session** and **navigates to Report**.
* [ ] Right panel shows **Overall/Intrinsic/Extraneous/Germane** values updating.
* [ ] Events are logged and **grouped by question** in the report UI.

---

## 16) Cursor Execution Notes (pin in workspace)

* Treat this file as **Single Source of Truth** for Sessions.
* If any previous spec conflicts, **this document wins** for Session behavior.
* Use **mock HR** & **mock questions** now; keep interfaces stable for replacement with real HR and formulas later.
* Keep all constants in a central `config.ts` for easy tuning.
