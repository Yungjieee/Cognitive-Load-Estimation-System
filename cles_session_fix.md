# CLES — Session Fix Task (Do not write new features; fix behavior)

**Context:** Use the existing “Sessions Module (Latest Spec)” as the source of truth. Apply the fixes below without breaking the flow (Calibration → Session → Report). Do **not** change APIs or data shapes.

---

## Objectives (must all pass)
1) **Always confirm Skip**
   - Any Skip action (with time remaining or from Time‑Up modal) must show an **irreversible confirmation**: “You cannot return to this question once skipped. Are you sure?”
   - Proceed only on confirm; otherwise stay on the same question.

2) **Extra Time feedback**
   - When Extra Time is granted on Time‑Up, visibly indicate the **exact seconds added** (e.g., “+21s”) next to the timer and in a toast/notice.
   - The progress bar must scale to the **new total limit** (not just remaining time).
   - Only one grant per question; further time‑outs follow the configured behavior (reopen modal or auto‑skip per config).

3) **Webcam position must not move**
   - The right‑hand sidebar (webcam + HR + loads) is **sticky and fixed size** during the entire session.
   - Submitting an answer and showing the reveal must **not** reflow or relocate the webcam card.

4) **Timer correctness after multiple Skips**
   - Ensure a **single running interval** at any time. Starting a new question fully resets the timer and **disposes** any previous interval.
   - After rapid consecutive Skips, each new question still receives its full time budget (30/50/70s as per schedule).

5) **One encouragement per question**
   - Show **at most one** encouragement message per question (immediately after reveal). Never rotate multiple messages on the same question.

---

## Guardrails
- Keep **Support/No‑Support** logic intact (hints/rest only in Support).
- Keep penalties: **hint −1 each (first open)**; **extra time −2 total**; **skip 0 points** and irreversible.
- Do not block answering if webcam/HR fail; show technical banner only.
- Do not alter data contracts, scoring math, or the 10‑question schedule.

---

## Acceptance Tests (run all)
- **Skip Confirmation:** Click Skip with time left → confirmation appears; cancel keeps you on the question; confirm skips and records 0 points. Repeat from Time‑Up modal—same behavior.
- **Extra Time UI:** On time‑up choose Extra Time → timer shows a **+Xs badge** (or equivalent) and progress bar extends; toast/notice communicates “+Xs (−2 pts)”.
- **Webcam Stability:** Submit an answer and view reveal → the webcam card stays in place; no layout shift or jump.
- **Timer After Skips:** Skip 2–3 questions quickly → each next question starts at its correct full limit; no “immediate zero” behavior.
- **Encouragement:** After reveal, exactly **one** encouragement line appears; does not change/repeat while staying on the same question.

---

## Reporting / Logs (unchanged, but verify)
- Events continue to log; report view **groups by question** (counts, not spammy timestamps).

---

## Deliverable
- Updated implementation that passes all acceptance tests above with **no regressions** to the existing session flow.

**If something conflicts with previous docs:** prioritize this task brief for Session behavior.
