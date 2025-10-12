# CLES — Phase 2 Plan & Database Implementation

> You finished **Phase 1 (MVP)**. This document lays out **what to build next** given you don’t have the heart‑rate sensor yet and will add the computational model later with your supervisor.

---

## A. Where You Are (✅ Phase 1 Recap)
- Auth (email/password), Welcome, Header/Nav
- Home (Subtopics grid + History list + profile banner)
- Profile page (required before start; return redirect)
- Settings (Support / No‑Support)
- Subtopic Details + guarded Start Preparation
- Calibration UI shell (webcam preview + 10s HR placeholder OK)
- Session basics (10 Q; correctness/score; save session & history)
- Report v1 (score + overall per‑question load **mocked**), PDF placeholder

---

## B. What’s Next (Phase 2 Target, adapted for no HR sensor yet)
**Goal:** Make the product *useful now* without HR hardware by completing **data plumbing and content**, then leave clean hooks for HR + ML later.

**Phase 2 (practical track)**
1. **Database real data hookup**
   - Users, Profiles, Settings
   - Subtopics
   - Questions (+ Admin CRUD)
   - Sessions, Responses, Events
2. **Question delivery from DB** (fetch 10 items by subtopic; shuffle/ordering rules)
3. **Report v2 structure** (add three‑load placeholders fed by rules/attention proxy or mock values; keep ML hook empty)
4. **Admin Question Bank UI** (bulk add, preview, enable/disable)
5. **Attention proxy (optional now)**: keep a simple webcam‑present/face‑detected boolean to influence *extraneous load* placeholder
6. **HR interface stubs**: backend endpoint + client subscription with a **mock HR generator**. When the sensor arrives, swap the generator for ESP32 ingestion.
7. **PDF export complete** (layout + charts)

> Items 1–4 unblock real usage (students can solve real questions, reports save and load). Items 5–6 ensure you won’t rewrite code when HR + ML arrive.

---

## C. Minimal Data Model (PostgreSQL / Supabase)

```sql
-- USERS
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  settings_mode text not null default 'support' check (settings_mode in ('support','no_support')),
  profile_completed boolean not null default false,
  profile_prior_knowledge jsonb,   -- {"Array":3, "Linked List":2, ...}
  profile_experience_note text,
  profile_interest_subtopics text[]
);

-- SUBTOPICS
create table subtopics (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,  -- 'Array','Linked List','Stack','Queue','Tree','Sorting'
  description text,
  enabled boolean not null default true
);

-- QUESTIONS
create table questions (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references subtopics(id) on delete cascade,
  difficulty int not null check (difficulty between 1 and 5),
  prompt text not null,
  qtype text not null check (qtype in ('mcq','short','code')),
  options jsonb,           -- for mcq: [{"key":"A","text":"..."}, ...]
  answer_key jsonb not null, -- mcq: {"correct":"B"}; short/code: schema you decide
  hint text,
  example text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- SESSIONS
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  subtopic_id uuid not null references subtopics(id) on delete restrict,
  mode text not null check (mode in ('support','no_support')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_ms bigint,
  calibration jsonb,  -- {"hrBaseline":..., "attentionBaseline":...}
  score_total int,
  avg_overall_load numeric,
  avg_intrinsic numeric,
  avg_extraneous numeric,
  avg_germane numeric
);

-- RESPONSES (per question)
create table responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  q_index int not null check (q_index between 1 and 10),
  user_answer jsonb,
  correct boolean,
  time_ms int,
  hints_used int default 0,
  metrics jsonb -- {overall_q:..., intrinsic_q:..., extraneous_q:..., germane_q:...}
);

-- EVENTS (timeline)
create table events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  ts_ms bigint not null,
  etype text not null, -- 'hint_open','rest_suggest','time_warning','device_alert','question_next',...
  payload jsonb
);
```

**Seed data**
```sql
insert into subtopics (name, description) values
 ('Array','Indexing, traversal, complexity basics'),
 ('Linked List','Singly/Doubly, insert/delete, traversal'),
 ('Stack','LIFO, push/pop, applications'),
 ('Queue','FIFO, circular queue, applications'),
 ('Tree','Binary tree, traversal, BST'),
 ('Sorting','Comparison sorts, stability, complexity');

-- Example MCQ for Array
insert into questions (subtopic_id, difficulty, prompt, qtype, options, answer_key, hint, example)
select id, 2,
  'What is the time complexity to access an element by index in a static array?',
  'mcq',
  '[{"key":"A","text":"O(n)"},{"key":"B","text":"O(log n)"},{"key":"C","text":"O(1)"},{"key":"D","text":"O(n log n)"}]'::jsonb,
  '{"correct":"C"}',
  'Think about direct indexing using base address + offset.',
  'Accessing arr[i] uses pointer arithmetic, giving constant time.'
from subtopics where name='Array';
```

---

## D. Backend API (practical set)

```http
POST   /auth/signup
POST   /auth/login
GET    /me
PUT    /me/profile            -- save prior knowledge/experience/interests; set completed=true
PUT    /me/settings           -- { mode: 'support'|'no_support' }

GET    /subtopics             -- list enabled subtopics
GET    /subtopics/:id         -- details

POST   /sessions              -- { subtopicId } → creates session; copies mode from user.settings
POST   /sessions/:id/calibration  -- save baselines (may be mock for now)

GET    /questions?subtopicId=...&limit=10  -- server picks 10 enabled questions
POST   /sessions/:id/responses             -- append per-question result
POST   /sessions/:id/finish                -- finalize + compute aggregates

GET    /reports/:sessionId    -- report JSON
GET    /reports/:sessionId/pdf

-- Admin
GET    /admin/questions?subtopicId=...
POST   /admin/questions
PUT    /admin/questions/:id
```

**Sample selection logic (10 questions):**
```sql
-- Prefer a spread of difficulties (1..5) but keep it simple now
select * from questions
 where subtopic_id = $1 and enabled = true
 order by difficulty, created_at
 limit 10;
-- or order by random() for shuffle if acceptable
```

---

## E. Frontend Wiring (Next.js style pseudocode)

**Fetch 10 questions from DB and render session**
```ts
// /api/questions?subtopicId=...
export async function GET(req) {
  const subtopicId = req.nextUrl.searchParams.get('subtopicId');
  const rows = await db.query(/* SQL above */);
  return NextResponse.json(rows);
}

// Session page
const { data: qs } = useSWR(`/api/questions?subtopicId=${id}`);
const [index, setIndex] = useState(0);

function submitAnswer(answer) {
  const q = qs[index];
  const correct = check(q, answer);
  post(`/api/sessions/${sessionId}/responses`, {
    questionId: q.id,
    q_index: index+1,
    user_answer: answer,
    correct,
    time_ms: elapsed,
    hints_used
  });
  setIndex(index+1);
}
```

**Guard: Start Preparation**
```ts
function handleStartPreparation(subtopicId) {
  if (!me.profile_completed) {
    openModal('Please complete your profile before starting.', {
      primaryAction: () => router.push(`/profile?return=/subtopics/${subtopicId}`),
    });
    return;
  }
  router.push(`/calibration?subtopic=${subtopicId}`);
}
```

---

## F. Reporting without HR (temporary signals)
Until HR arrives, compute placeholder loads so reports are meaningful:

- **Intrinsic (per question):** map from `difficulty` → `[0..1]` (e.g., `diff/5`).
- **Extraneous:**
  - +0.3 if user navigates away (lost face) frequently (if webcam proxy on)
  - +0.2 if time warning fired
  - +0.1 per context switch (next/prev quickly)
- **Germane:**
  - Start at `attention_avg` if using webcam proxy (else start 0.6)
  - Multiply by `(1 - hints_used / hints_available)` in **Support** mode
  - Multiply by `active_solving_ratio` (typing/selection dwell)

**Overall per-frame (no HR path):**
```
overall_t = w2*(1 - att_t) + w3*extraneous_t + w4*difficulty_q
```

**Aggregate per question:** EMA smoothing → `overall_q`; save `intrinsic_q / extraneous_q / germane_q` to `responses.metrics`.

> When HR is ready, just add `w1*hr_t` back and update the compute function centrally.

---

## G. HR Ingestion Plan (stub now, plug sensor later)

**Backend endpoint (ready now)**
```http
POST /ingest/hr  -- body: { sessionId, deviceId, ts, bpm }
```
- Validate `sessionId` belongs to an active session
- Persist to a lightweight `hr_samples(session_id, ts, bpm)` table or in‑memory ring buffer
- Broadcast over WS: `channel sessionId` → frontend chart/compute module

**ESP32 (later)** — pseudo firmware loop:
```c
setup_wifi();
for (;;) {
  int bpm = read_sensor(); // or mock now
  post_json("/ingest/hr", { sessionId, deviceId, ts: millis(), bpm });
  delay(1000); // 1 Hz
}
```

**Frontend subscriber**
```ts
ws.onmessage = (msg) => {
  const { ts, bpm } = JSON.parse(msg.data);
  hrBuffer.push({ ts, bpm });
  // compute hr_t via normalization against calibration.baseline
}
```

**Mock HR generator (use now)**
```ts
// Node/Server: emit synthetic HR around 75±8 bpm, spike on time warnings
function mockHrTick(sessionId) {
  const base = 75 + randn()*8;
  const spike = recentTimeWarning(sessionId) ? 10 : 0;
  publishWS(sessionId, { ts: Date.now(), bpm: Math.round(base + spike) });
}
```

---

## H. Admin Question Bank (must‑have in Phase 2)
- **Views:** Subtopic list → Questions table (prompt, difficulty, qtype, enabled, editedAt)
- **Bulk Add:** CSV paste or multi‑row form (server validates and inserts)
- **Preview:** render MCQ/short/code before enabling
- **Filters:** by subtopic, difficulty, enabled

**CSV format suggestion**
```
subtopic,difficulty,qtype,prompt,options,answer_key,hint,example
Array,2,mcq,"Access by index complexity?","[{""key"":""A"",""text"":""O(n)""},...]","{""correct"":""C""}","Think about offset.","Constant time via pointer arithmetic."
```

---

## I. PDF Export (complete it now)
- Use a consistent header (logo + session meta)
- Include Chart 1 (overall per Q) + Chart 2 (three‑load per Q) + Timeline
- 1–2 paragraphs of insights with bullet recommendations
- Footer: student name, subtopic, mode, date/time

---

## J. Quality Gates (to close Phase 2)
- [ ] Login → Home shows enabled subtopics from DB
- [ ] Profile saved and enforced at start time (not during exploration)
- [ ] Settings persists mode and sessions copy it
- [ ] Start Preparation guarded; Calibration route guard works
- [ ] Creating a session fetches **10 questions** from chosen subtopic
- [ ] Responses saved per question (correctness, time, hints_used)
- [ ] Report loads from DB and renders both charts using saved metrics (even if mocked)
- [ ] Admin can add/enable/disable questions; disabled never served
- [ ] PDF export produces stable, readable file
- [ ] HR mock stream visible in dev mode; easy switch to real ingest later

---

## K. Nice‑to‑Have (optional during Phase 2)
- History filters (date, subtopic, mode)
- Compare two sessions (Support vs No‑Support) side‑by‑side
- Export CSV of sessions/responses for research

---

## L. When HR sensor & ML are ready (Phase 2.5/3 hooks)
1. Replace **mockHrTick** with real ESP32 ingestion → same `/ingest/hr` endpoint
2. Add `hr_samples` aggregation → compute `hr_t` and merge into `overall_t`
3. Introduce your computational model formulas into the **compute module**; keep thresholds configurable
4. Update Report narrative to reference the model’s signals/thresholds

> This plan delivers a working system now (DB‑backed content and reports), while keeping integration smooth for HR + ML later.

