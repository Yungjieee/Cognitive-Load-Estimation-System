# NASA-TLX Cognitive Load Implementation Plan

## Overview
This document defines the formulas and implementation approach for calculating NASA-TLX cognitive load dimensions from system measurements in the CLES (Cognitive Load Estimation System).

**NASA-TLX Scale:** Each dimension is scored from 0-21
- 0 = Very Low demand/load
- 10.5 = Moderate demand/load
- 21 = Very High demand/load

**Approach:** Calculate objective measurements from system data and map them to NASA-TLX scales for comparison with subjective post-session surveys.

---

## Status

- [x] **Mental Demand** - ✅ CONFIRMED
- [x] **Physical Demand** - ✅ CONFIRMED
- [x] **Temporal Demand** - ✅ CONFIRMED
- [x] **Frustration** - ✅ CONFIRMED
- [x] **Performance** - ✅ CONFIRMED
- [x] **Effort** - ✅ CONFIRMED

**All 6 NASA-TLX dimensions are now defined and confirmed!** ✅

---

## 1. Mental Demand ✅

### Definition
Mental Demand measures how much mental and perceptual activity is required. In CLES, it represents the **mismatch between task difficulty and student preparedness**.

### Formula

#### Step 1: Prior Knowledge (0-1 scale)

**Familiarity Component (per subtopic):**
```
none         = 0
basic        = 0.25
familiar     = 0.5
intermediate = 0.75
advanced     = 1.0
```

**Math Grade Component:**
```
A          = 1.0
B          = 0.75
C          = 0.5
D          = 0.25
F          = 0
not_taken  = 0
```

**Programming Grade Component:**
```
A          = 1.0
B          = 0.75
C          = 0.5
D          = 0.25
F          = 0
not_taken  = 0
```

**Combined Prior Knowledge:**
```typescript
prior_knowledge = 0.5 * familiarity + 0.25 * math_grade + 0.25 * programming_grade
// Range: 0-1
// Weights: Familiarity (50%), Math (25%), Programming (25%)
```

#### Step 2: Experience Level (0-1 scale)

**Course Taken:**
```
yes             = 1
no / not_sure   = 0
```

**Practice Level:**
```
none            = 0
some_exercises  = 0.33
small_project   = 0.66
large_project   = 1.0
```

**Combined Experience:**
```typescript
experience_level = 0.8 * practice_level + 0.2 * course_taken
// Range: 0-1
// Note: Hands-on practice weighted 4x more than course completion
```

#### Step 3: Preparedness (0-1 scale)

```typescript
preparedness = 0.6 * prior_knowledge + 0.4 * experience_level
// Range: 0-1
// Note: Prior knowledge weighted slightly higher than experience
```

#### Step 4: Task Difficulty (0-1 scale)

```
Easy   (E) = 0.2
Medium (M) = 0.5
Hard   (H) = 1.0
```

#### Step 5: Mental Demand (0-21 scale)

```typescript
mental_demand = (difficulty * (1 - preparedness)) * 21
// Range: 0-21
```

### Example Calculations

**Example 1: Complete Beginner + Hard Question**
- Familiarity: none = 0
- Math grade: F = 0
- Programming grade: not_taken = 0
- Prior knowledge = 0.5(0) + 0.25(0) + 0.25(0) = **0**
- Course taken: no = 0
- Practice level: none = 0
- Experience level = 0.8(0) + 0.2(0) = **0**
- Preparedness = 0.6(0) + 0.4(0) = **0**
- Difficulty: Hard = 1.0
- **Mental Demand = (1.0 * 1.0) * 21 = 21.0 / 21** (Maximum)

**Example 2: Beginner with C Grades + Hard Question**
- Familiarity: none = 0
- Math grade: C = 0.5
- Programming grade: C = 0.5
- Prior knowledge = 0.5(0) + 0.25(0.5) + 0.25(0.5) = **0.25**
- Course taken: no = 0
- Practice level: none = 0
- Experience level = 0.8(0) + 0.2(0) = **0**
- Preparedness = 0.6(0.25) + 0.4(0) = **0.15**
- Difficulty: Hard = 1.0
- **Mental Demand = (1.0 * 0.85) * 21 = 17.85 / 21** (Very High)

**Example 3: Expert + Hard Question**
- Familiarity: advanced = 1.0
- Math grade: A = 1.0
- Programming grade: A = 1.0
- Prior knowledge = 0.5(1.0) + 0.25(1.0) + 0.25(1.0) = **1.0**
- Course taken: yes = 1
- Practice level: large_project = 1.0
- Experience level = 0.8(1.0) + 0.2(1.0) = **1.0**
- Preparedness = 0.6(1.0) + 0.4(1.0) = **1.0**
- Difficulty: Hard = 1.0
- **Mental Demand = (1.0 * 0) * 21 = 0 / 21** (Minimum)

### Implementation Requirements

#### Database Schema Changes

Add to `users` table:
```sql
ALTER TABLE users ADD COLUMN profile_math_grade VARCHAR(20);
ALTER TABLE users ADD COLUMN profile_programming_grade VARCHAR(20);
-- Possible values: 'A', 'B', 'C', 'D', 'F', 'not_taken'
```

Update TypeScript interface in `src/lib/database.ts`:
```typescript
export interface User {
  // ... existing fields
  profile_math_grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken' | null
  profile_programming_grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken' | null
}
```

#### UI Changes

Update `src/app/profile/page.tsx`:

1. Add grade options constants:
```typescript
const GRADE_OPTIONS = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "F", label: "F" },
  { value: "not_taken", label: "Not Taken" }
];
```

2. Add state variables:
```typescript
const [mathGrade, setMathGrade] = useState("");
const [programmingGrade, setProgrammingGrade] = useState("");
```

3. Add two new sections in the form:
   - "What is your Math grade?" (General Math)
   - "What is your Programming grade?" (General Programming)

4. Update form validation to include grade fields

5. Update `handleSave()` to save grade fields to database

#### Implementation Location

Create new utility file: `src/lib/nasaTlx.ts`

```typescript
export function calculateMentalDemand(
  difficulty: 'E' | 'M' | 'H',
  familiarity: string,  // 'none' | 'basic' | 'familiar' | 'intermediate' | 'advanced'
  mathGrade: string,    // 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken'
  programmingGrade: string,  // 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken'
  courseTaken: string | null,  // 'yes' | 'no' | 'not_sure' | null
  practiceLevel: string | null  // 'none' | 'some_exercises' | 'small_project' | 'large_project' | null
): number {
  // Map values to 0-1 scale
  const familiarityMap = { none: 0, basic: 0.25, familiar: 0.5, intermediate: 0.75, advanced: 1.0 }
  const gradeMap = { A: 1.0, B: 0.75, C: 0.5, D: 0.25, F: 0, not_taken: 0 }
  const practiceLevelMap = { none: 0, some_exercises: 0.33, small_project: 0.66, large_project: 1.0 }

  // Step 1: Prior Knowledge
  const familiarityValue = familiarityMap[familiarity] || 0
  const mathGradeValue = gradeMap[mathGrade] || 0
  const programmingGradeValue = gradeMap[programmingGrade] || 0
  const priorKnowledge = 0.5 * familiarityValue + 0.25 * mathGradeValue + 0.25 * programmingGradeValue

  // Step 2: Experience Level
  const courseTakenValue = (courseTaken === 'yes') ? 1 : 0
  const practiceLevelValue = practiceLevelMap[practiceLevel] || 0
  const experienceLevel = 0.8 * practiceLevelValue + 0.2 * courseTakenValue

  // Step 3: Preparedness
  const preparedness = 0.6 * priorKnowledge + 0.4 * experienceLevel

  // Step 4: Task Difficulty
  const difficultyMap = { E: 0.2, M: 0.5, H: 1.0 }
  const difficultyValue = difficultyMap[difficulty] || 0.5

  // Step 5: Mental Demand
  const mentalDemand = (difficultyValue * (1 - preparedness)) * 21

  return Math.max(0, Math.min(21, mentalDemand))
}
```

#### Data Flow

1. **Session Start**: Fetch user profile from database (including grades and familiarity)
2. **Question Start**: Get question difficulty and subtopic
3. **Question End**: Calculate mental demand using:
   - User's familiarity for the specific subtopic
   - User's math and programming grades
   - User's course taken and practice level
   - Question difficulty
4. **Response Save**: Store mental demand in `nasa_tlx_system.mental_demand`

---

## 2. Physical Demand ✅

### Definition
Physical Demand measures physical exertion and effort. In CLES, it represents **environmental noise and distractions** that affect the user during the session.

### Concept
Instead of traditional physical exertion (not relevant for computer-based tasks), we measure environmental factors that create physical discomfort or distraction (noise, interruptions, environment quality).

### Collection Method

**Timing:** Immediately after calibration completes (after RMSSD baseline is displayed)

**UI:** Popup modal overlay (on top of existing calibration complete screen)

**Question:** "How noisy/distracting is your current environment?"

**Input:** Slider (0-21 scale)
- 0 = Very Quiet
- 21 = Very Noisy

**Button:** "OK" button only (no cancel option)

### Formula

```typescript
physical_demand = environment_noise
// Direct value from slider (0-21)
// No calculation needed
```

### Implementation Requirements

#### Database Schema Changes

Add to `sessions` table:
```sql
ALTER TABLE sessions ADD COLUMN environment_noise DECIMAL(5,2);
```

Update TypeScript interface in `src/lib/database.ts`:
```typescript
export interface Session {
  // ... existing fields
  environment_noise?: number
}
```

#### UI Changes

Update `src/app/calibration/page.tsx`:

**1. Add state variables:**
```typescript
const [environmentNoise, setEnvironmentNoise] = useState<number>(10); // Default to middle
const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
```

**2. Show modal after RMSSD baseline calculation:**
```typescript
// In the RMSSD calculation success block (around line 234-238)
if (data.success) {
  console.log(`✅ RMSSD baseline calculated: ${data.rmssdBase.toFixed(2)}ms`);
  setRmssdBaseline(data.rmssdBase);
  setCalibrationPassed(true);  // Keep this - show existing UI
  setShowEnvironmentModal(true);  // ALSO show modal on top
  rmssdCalculatedRef.current = true;
}
```

**3. Add modal submit handler:**
```typescript
const handleEnvironmentSubmit = async () => {
  if (!dbSessionId) {
    console.error('❌ Missing session ID');
    return;
  }

  try {
    console.log(`💾 Saving environment noise: ${environmentNoise} for session ${dbSessionId}`);

    await DatabaseClient.updateSession(String(dbSessionId), {
      environment_noise: environmentNoise
    });

    console.log('✅ Environment noise saved');
    setShowEnvironmentModal(false);  // Close modal, reveal "Start Task" button behind
  } catch (error) {
    console.error('❌ Failed to save environment noise:', error);
    alert('Failed to save environment settings. Please try again.');
  }
};
```

**4. Add modal UI component (overlay on top of existing UI):**
```tsx
{showEnvironmentModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-purple-200 dark:border-purple-800">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-purple-600 dark:text-purple-400 text-2xl">🔊</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Environment Check
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Before we begin, please rate your environment
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
          How noisy/distracting is your current environment?
        </label>
        <input
          type="range"
          min="0"
          max="21"
          step="1"
          value={environmentNoise}
          onChange={(e) => setEnvironmentNoise(Number(e.target.value))}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <div className="flex justify-between text-sm mt-3 text-gray-600 dark:text-gray-400">
          <span>Very Quiet</span>
          <span className="font-bold text-2xl text-purple-600 dark:text-purple-400">
            {environmentNoise}
          </span>
          <span>Very Noisy</span>
        </div>
        <div className="text-center mt-2 text-xs text-gray-500 dark:text-gray-400">
          0 = Very Quiet | 21 = Very Noisy
        </div>
      </div>

      <button
        onClick={handleEnvironmentSubmit}
        className="w-full rounded-xl px-6 py-3 btn-primary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
      >
        OK
      </button>
    </div>
  </div>
)}
```

#### Calibration Page Flow

**Visual Flow:**
```
1. [Calibration Running...] (existing)
         ↓
2. [Calibration Complete! RMSSD: 48.5ms] (existing - shown on page)
   [Start Task button appears] (existing)
         ↓
3. [Environment Modal Pops Up] (NEW - overlays on top)
   ┌─────────────────────────────┐
   │  🔊 Environment Check       │
   │  How noisy/distracting is   │
   │  your current environment?  │
   │  [──────●──────────]        │
   │  Very Quiet  12  Very Noisy │
   │     [OK Button]             │
   └─────────────────────────────┘
         ↓
4. User clicks OK → Modal closes
         ↓
5. [Calibration Complete screen visible again] (existing)
   [Start Task button clickable] (existing)
         ↓
6. User clicks "Start Task" → Begin questions
```

**Key Points:**
- Existing "Calibration Complete" UI remains unchanged
- Modal appears **on top** as overlay
- Modal has only "OK" button (no cancel)
- After closing modal, user returns to existing calibration complete screen
- User then clicks existing "Start Task" button

#### Data Flow

1. **Calibration Phase**: User completes 60s breathing calibration
2. **RMSSD Calculation**: Baseline RMSSD is calculated and saved
3. **Show Calibration Complete**: Display existing "Calibration Complete!" message with RMSSD value
4. **Environment Modal**: Popup overlay appears asking user to rate environment noise (0-21)
5. **User Rates**: Adjust slider and click "OK"
6. **Save to Database**: `sessions.environment_noise` is updated
7. **Modal Closes**: User sees "Start Task" button again
8. **Question Phase**: When creating NASA-TLX records, query `session.environment_noise` and use as `physical_demand` for all 5 questions

#### Implementation in nasa_tlx_system

```typescript
// When creating NASA-TLX system records (in sessionEngine or question end handler):

// Get session with environment_noise
const session = await DatabaseClient.getSession(sessionId);
const environmentNoise = session.environment_noise || 10; // Default 10 if not set

// Create nasa_tlx_system record
await supabase.from('nasa_tlx_system').insert({
  session_id: sessionId,
  q_index: questionIndex,
  mental_demand: calculatedMentalDemand,
  physical_demand: environmentNoise,  // ← Use environment noise from session
  temporal_demand: calculatedTemporalDemand,
  performance: calculatedPerformance,
  effort: calculatedEffort,
  frustration: calculatedFrustration,
  cognitive_load: calculatedCognitiveLoad
});
```

---

## 3. Frustration ✅

### Definition
Frustration measures the level of stress, irritation, or annoyance experienced during the task. In CLES, it is calculated using **Heart Rate Variability (HRV) via RMSSD** compared to baseline.

### Formula

**Bidirectional Asymmetric Approach:**
- Neutral point: 10.5
- Relaxation side (RMSSD > baseline): 0 to 10.5
- Stress side (RMSSD < baseline): 10.5 to 21

#### Relaxation Side (questionRMSSD >= baselineRMSSD)

```typescript
const diff = questionRMSSD - baselineRMSSD
const frustration = 10.5 - (diff / baselineRMSSD) * 10.5
frustration = Math.max(0, frustration)
// Range: 0-10.5
```

**Logic:**
- More relaxed than baseline → Lower frustration
- If RMSSD doubles (100% increase) → frustration = 0

#### Stress Side (questionRMSSD < baselineRMSSD)

```typescript
const diff = baselineRMSSD - questionRMSSD
const minRMSSD = baselineRMSSD * 0.3  // 30% physiological floor
const maxRange = baselineRMSSD - minRMSSD
const frustration = 10.5 + (diff / maxRange) * 10.5
frustration = Math.min(21, frustration)
// Range: 10.5-21
```

**Logic:**
- More stressed than baseline → Higher frustration
- Uses asymmetric adjustment with 30% floor to account for physiological limits
- RMSSD reaching 30% of baseline → frustration = 21

### Example Calculations

**Baseline: 50ms**

**Example 1: Very Relaxed (RMSSD = 75ms)**
- diff = 75 - 50 = 25
- frustration = 10.5 - (25/50) * 10.5 = 10.5 - 5.25 = **5.25 / 21**

**Example 2: Slightly Relaxed (RMSSD = 55ms)**
- diff = 55 - 50 = 5
- frustration = 10.5 - (5/50) * 10.5 = 10.5 - 1.05 = **9.45 / 21**

**Example 3: At Baseline (RMSSD = 50ms)**
- diff = 0
- frustration = 10.5 - 0 = **10.5 / 21** (Neutral)

**Example 4: Slightly Stressed (RMSSD = 40ms)**
- diff = 50 - 40 = 10
- minRMSSD = 50 * 0.3 = 15
- maxRange = 50 - 15 = 35
- frustration = 10.5 + (10/35) * 10.5 = 10.5 + 3.0 = **13.5 / 21**

**Example 5: Very Stressed (RMSSD = 20ms)**
- diff = 50 - 20 = 30
- maxRange = 35
- frustration = 10.5 + (30/35) * 10.5 = 10.5 + 9.0 = **19.5 / 21**

**Example 6: Maximum Stress (RMSSD = 15ms, at 30% floor)**
- diff = 50 - 15 = 35
- maxRange = 35
- frustration = 10.5 + (35/35) * 10.5 = 10.5 + 10.5 = **21.0 / 21** (Maximum)

### Implementation Requirements

#### Implementation Location

Add function to `src/lib/nasaTlx.ts`:

```typescript
export function calculateFrustration(
  baselineRMSSD: number,
  questionRMSSD: number
): number {
  const NEUTRAL = 10.5

  // RELAXATION SIDE (questionRMSSD >= baseline)
  if (questionRMSSD >= baselineRMSSD) {
    const diff = questionRMSSD - baselineRMSSD
    const frustration = NEUTRAL - (diff / baselineRMSSD) * NEUTRAL
    return Math.max(0, frustration)
  }

  // STRESS SIDE (questionRMSSD < baseline)
  else {
    const diff = baselineRMSSD - questionRMSSD
    const minRMSSD = baselineRMSSD * 0.3  // 30% floor
    const maxRange = baselineRMSSD - minRMSSD
    const frustration = NEUTRAL + (diff / maxRange) * NEUTRAL
    return Math.min(21, frustration)
  }
}
```

#### Data Flow

1. **Calibration Phase**: Calculate baseline RMSSD (stored in `sessions.rmssd_baseline`)
2. **Question Phase**: Collect HR beats with q_label (e.g., 'q1', 'q2')
3. **Question End**: Calculate RMSSD for question period using beats from that question
4. **Calculate Frustration**: Use baseline RMSSD vs question RMSSD
5. **Response Save**: Store frustration in `nasa_tlx_system.frustration`

#### Notes

- RMSSD calculation already exists in `src/lib/hrvConfig.ts`
- HR beats are collected via MQTT and stored in `hr_beats` table
- Baseline RMSSD is calculated during calibration phase

---

## 4. Temporal Demand ✅

### Definition
Temporal Demand measures how much time pressure the user felt due to the rate or pace at which the task occurred. In CLES, it represents **the proportion of available time used** before answering or skipping a question.

### Concept
Time pressure is measured by how much of the **original time limit** was consumed, regardless of whether extra time was requested. If a user exhausts the original time limit and requests extra time, they have already experienced maximum temporal demand.

### Formula

**Simple Linear Approach:**

```typescript
// If extra time was used, they must have used all original time
const timeUsedOriginal = extra_time_used
  ? originalLimit
  : time_ms / 1000  // Convert milliseconds to seconds

// Temporal demand (0-21 scale)
temporal_demand = (timeUsedOriginal / originalLimit) * 21
```

**Key Principle:** Extra time is **NOT** counted in temporal demand calculation. Only the original time limit matters.

### Rationale

**Why ignore extra time?**
- Using all original time = maximum time pressure experienced
- Requesting extra time indicates high temporal demand was already felt
- Extra time usage doesn't reduce the pressure felt during original time period
- Temporal demand = 21 once original time is exhausted, regardless of extra time used

### Available Data

From system:
1. **Time Used**: `responses.time_ms` (milliseconds) - Time spent on question
2. **Extra Time Flag**: `responses.extra_time_used` (boolean) - Whether extra time was requested
3. **Original Time Limits**: From `SCHEDULE` config
   - Q1 (Easy): 30 seconds
   - Q2 (Medium): 50 seconds
   - Q3 (Medium): 50 seconds
   - Q4 (Hard): 60 seconds
   - Q5 (Hard): 60 seconds

### Example Calculations

**Example 1: Q1 (Easy, 30s), finished quickly**
- time_ms = 15,000 (15 seconds)
- extra_time_used = false
- originalLimit = 30s
- timeUsedOriginal = 15,000 / 1000 = 15s
- **Temporal Demand = (15/30) * 21 = 10.5 / 21** (Moderate)

**Example 2: Q2 (Medium, 50s), almost timed out**
- time_ms = 48,000 (48 seconds)
- extra_time_used = false
- originalLimit = 50s
- timeUsedOriginal = 48,000 / 1000 = 48s
- **Temporal Demand = (48/50) * 21 = 20.16 / 21** (Very High)

**Example 3: Q4 (Hard, 60s), used all original time, requested extra time**
- time_ms = 50,000 (may be incorrect due to system bug, but ignored)
- extra_time_used = **true**
- originalLimit = 60s
- timeUsedOriginal = 60s (all original time, ignore time_ms)
- **Temporal Demand = (60/60) * 21 = 21.0 / 21** (Maximum)

**Example 4: Q4 (Hard, 60s), requested extra time, used total 95s**
- time_ms = 50,000 (buggy value, ignored)
- extra_time_used = **true**
- originalLimit = 60s
- timeUsedOriginal = 60s (all original time must be used to request extra)
- **Temporal Demand = (60/60) * 21 = 21.0 / 21** (Maximum)
- Note: Extra 35s used is irrelevant for temporal demand

**Example 5: Q5 (Hard, 60s), expert finishing early**
- time_ms = 20,000 (20 seconds)
- extra_time_used = false
- originalLimit = 60s
- timeUsedOriginal = 20,000 / 1000 = 20s
- **Temporal Demand = (20/60) * 21 = 7.0 / 21** (Low)

### Implementation Requirements

#### Implementation Location

Add function to `src/lib/nasaTlx.ts`:

```typescript
export function calculateTemporalDemand(
  time_ms: number,
  q_index: number,  // 1, 2, 3, 4, 5
  extra_time_used: boolean
): number {
  const SCHEDULE = [
    { idx: 1, limit: 30 },
    { idx: 2, limit: 50 },
    { idx: 3, limit: 50 },
    { idx: 4, limit: 60 },
    { idx: 5, limit: 60 }
  ]

  const question = SCHEDULE.find(q => q.idx === q_index)
  if (!question) return 0  // Error indicator - invalid question index

  const originalLimit = question.limit  // seconds

  // If extra time was used, they must have used all original time
  const timeUsedOriginal = extra_time_used
    ? originalLimit
    : time_ms / 1000  // Convert milliseconds to seconds

  // Temporal demand (0-21 scale)
  const temporalDemand = (timeUsedOriginal / originalLimit) * 21

  return Math.max(0, Math.min(21, temporalDemand))
}
```

#### Data Flow

1. **Question Phase**: User answers question, timer tracks time
2. **Question End**: System records:
   - `time_ms`: Time spent (from timer)
   - `extra_time_used`: Whether extra time was requested
3. **Calculate Temporal Demand**:
   - If extra time used → Use full original limit
   - If no extra time → Use actual time_ms
   - Divide by original limit and scale to 0-21
4. **Response Save**: Store temporal demand in `nasa_tlx_system.temporal_demand`

#### Notes on time_ms Data Quality

**Known Issue:** `responses.time_ms` may be incorrectly recorded when extra time is used due to a bug in `sessionEngine.ts` (line 581):
```typescript
time_ms: (config.limit - this.state.timeRemaining) * 1000
```

This formula doesn't account for extended time, so if a user:
- Uses all 60s original time
- Requests extra 42s
- Uses 30s of extra time (12s remaining)
- Recorded time_ms = (60 - 12) * 1000 = 48,000ms ❌ (should be 90,000ms)

**Solution for Temporal Demand:** When `extra_time_used = true`, we **ignore `time_ms`** and assume all original time was used (which must be true, as they couldn't request extra time without exhausting original time).

This workaround ensures temporal demand is calculated correctly regardless of the time_ms bug.

---

## 5. Performance ✅

### Definition
Performance measures how successful the user was at completing the task. In NASA-TLX, Performance is **INVERTED** (0 = perfect success, 21 = complete failure).

### Concept
Performance is calculated using the **points-based inverted approach**, reflecting how well the user performed relative to the maximum possible points for each question. Points are already reduced by penalties (hints, examples, extra time), providing a comprehensive measure of performance quality.

### Formula

**Points-Based Inverted Formula:**

```typescript
// Step 1: Get maximum possible points for this question
const maxPoints = SCHEDULE[q_index - 1].points
// Q1 (Easy): 1.0
// Q2-Q3 (Medium): 2.0
// Q4-Q5 (Hard): 2.5

// Step 2: Get actual points awarded (from response metrics)
const pointsAwarded = response.metrics.pointsAwarded
// Already accounts for:
// - Correctness (0 if wrong)
// - Hint penalty: -0.01 per hint
// - Example penalty: -0.01 if used
// - Extra time penalty: -0.01 if used

// Step 3: Calculate point ratio (0-1)
const pointRatio = pointsAwarded / maxPoints

// Step 4: Invert for NASA-TLX performance (0-21)
performance = (1 - pointRatio) * 21
// Perfect score → performance = 0
// Complete failure → performance = 21
```

### Available Data

From system:
1. **Points Awarded**: `responses.metrics.pointsAwarded` - Final score after penalties
2. **Maximum Points**: From `SCHEDULE` config based on `q_index`
3. **Penalties Applied** (already deducted from pointsAwarded):
   - Hint penalty: 0.01 per hint used
   - Example penalty: 0.01 if example viewed
   - Extra time penalty: 0.01 if extra time requested
4. **Correctness**: If incorrect, pointsAwarded = 0 automatically

### Example Calculations

**Example 1: Q1 (Easy, max 1.0), perfect answer**
- pointsAwarded = 1.0
- maxPoints = 1.0
- pointRatio = 1.0 / 1.0 = 1.0
- **Performance = (1 - 1.0) * 21 = 0.0 / 21** (Perfect)

**Example 2: Q2 (Medium, max 2.0), correct with 1 hint**
- hintPenalty = 1 × 0.01 = 0.01
- pointsAwarded = 2.0 - 0.01 = 1.99
- maxPoints = 2.0
- pointRatio = 1.99 / 2.0 = 0.995
- **Performance = (1 - 0.995) * 21 = 0.105 / 21** (Excellent, minor penalty)

**Example 3: Q4 (Hard, max 2.5), correct with 2 hints + example**
- hintPenalty = 2 × 0.01 = 0.02
- examplePenalty = 0.01
- totalPenalty = 0.03
- pointsAwarded = 2.5 - 0.03 = 2.47
- maxPoints = 2.5
- pointRatio = 2.47 / 2.5 = 0.988
- **Performance = (1 - 0.988) * 21 = 0.252 / 21** (Excellent, minimal penalties)

**Example 4: Q5 (Hard, max 2.5), correct with 3 hints + example + extra time**
- hintPenalty = 3 × 0.01 = 0.03
- examplePenalty = 0.01
- extraTimePenalty = 0.01
- totalPenalty = 0.05
- pointsAwarded = 2.5 - 0.05 = 2.45
- maxPoints = 2.5
- pointRatio = 2.45 / 2.5 = 0.98
- **Performance = (1 - 0.98) * 21 = 0.42 / 21** (Very good, moderate help used)

**Example 5: Q3 (Medium, max 2.0), incorrect answer**
- pointsAwarded = 0 (wrong answer)
- maxPoints = 2.0
- pointRatio = 0 / 2.0 = 0
- **Performance = (1 - 0) * 21 = 21.0 / 21** (Complete failure)

**Example 6: Q4 (Hard, max 2.5), skipped**
- pointsAwarded = 0 (skipped)
- maxPoints = 2.5
- pointRatio = 0 / 2.5 = 0
- **Performance = (1 - 0) * 21 = 21.0 / 21** (Complete failure)

**Example 7: Q1 (Easy, max 1.0), correct with extreme help (5 hints + example + extra time)**
- hintPenalty = 5 × 0.01 = 0.05
- examplePenalty = 0.01
- extraTimePenalty = 0.01
- totalPenalty = 0.07
- pointsAwarded = 1.0 - 0.07 = 0.93
- maxPoints = 1.0
- pointRatio = 0.93 / 1.0 = 0.93
- **Performance = (1 - 0.93) * 21 = 1.47 / 21** (Good, but significant help needed)

### Implementation Requirements

#### Implementation Location

Add function to `src/lib/nasaTlx.ts`:

```typescript
export function calculatePerformance(
  q_index: number,  // 1, 2, 3, 4, 5
  pointsAwarded: number
): number {
  const SCHEDULE = [
    { idx: 1, points: 1.0 },
    { idx: 2, points: 2.0 },
    { idx: 3, points: 2.0 },
    { idx: 4, points: 2.5 },
    { idx: 5, points: 2.5 }
  ]

  const question = SCHEDULE.find(q => q.idx === q_index)
  if (!question) return 21  // Error indicator - invalid question, assume complete failure

  const maxPoints = question.points

  // Calculate point ratio (0-1)
  const pointRatio = pointsAwarded / maxPoints

  // Invert for NASA-TLX performance (0-21)
  // Perfect score (pointRatio = 1) → performance = 0
  // Complete failure (pointRatio = 0) → performance = 21
  const performance = (1 - pointRatio) * 21

  return Math.max(0, Math.min(21, performance))
}
```

#### Data Flow

1. **Question Phase**: User answers question, system collects data
2. **Question End**: System calculates points awarded:
   - Base points from SCHEDULE (1.0, 2.0, 2.0, 2.5, 2.5)
   - Subtract hint penalty (0.01 per hint)
   - Subtract example penalty (0.01 if used)
   - Subtract extra time penalty (0.01 if used)
   - If incorrect: pointsAwarded = 0
3. **Store Points**: Save to `responses.metrics.pointsAwarded`
4. **Calculate Performance**: Use formula above with q_index and pointsAwarded
5. **Response Save**: Store performance in `nasa_tlx_system.performance`

#### Notes

- Points are calculated in `sessionEngine.ts` (lines 562-567)
- Points already stored in `responses.metrics.pointsAwarded`
- No additional data collection needed
- Performance directly reflects objective success (points earned)
- Inverted scale matches NASA-TLX standard (lower is better)
- Penalty values (0.01) encourage help-seeking without heavy punishment

---

## 6. Effort ✅

### Definition
Effort measures how hard the user had to work (mentally and physically) to accomplish their level of performance. In CLES, it represents the **combined investment of time, help-seeking, and attention** during the task.

### Concept
Effort is calculated using a **composite weighted approach** that combines three effort indicators with equal weights. Higher values indicate more effort invested, reflecting longer work time, more help needed, and higher attention/focus maintained.

### Formula

**Composite Weighted Formula:**

```typescript
// Step 1: Time component (0-1)
const timeUsed = extra_time_used ? originalLimit : time_ms / 1000
const timeRatio = timeUsed / originalLimit

// Step 2: Help-seeking component (0-1)
const exampleUsed = examplePenalty > 0 ? 1 : 0  // Detect from penalty
const helpRatio = (hintsUsed + exampleUsed) / 4  // Max: 3 hints + 1 example = 4

// Step 3: Attention component (0-1)
const attentionRatio = (attention_rate ?? 50) / 100  // Default 50% if missing

// Step 4: Combine with equal weights (33.33% each)
effort = (
  0.33 * timeRatio +      // 33% - time invested
  0.33 * helpRatio +      // 33% - help needed
  0.33 * attentionRatio   // 33% - attention invested
) * 21
```

**Key Principles:**
- **Time**: More time spent = more effort
- **Help-seeking**: More hints/examples used = more effort needed
- **Attention**: Higher attention = more focus/effort invested (direct, not inverted)
- **Equal weights**: All three components contribute equally (33.33% each)

### Available Data

From system:
1. **Time Used**: `responses.time_ms` (milliseconds) and `responses.extra_time_used` (boolean)
2. **Hints Used**: `responses.hints_used` (count, max 3)
3. **Example Used**: Detected from `responses.metrics.examplePenalty` (0 = not used, 0.01 = used)
4. **Attention Rate**: `responses.attention_rate` (percentage 0-100, null if unavailable)
5. **Original Time Limits**: From `SCHEDULE` config (30s, 50s, 50s, 60s, 60s)

### Example Calculations

**Example 1: Q1 (Easy, 30s), expert student - quick & focused**
- Time: 15s / 30s = 0.5
- Help: 0 hints, no example (penalty=0) → (0+0)/4 = 0
- Attention: 90% → 0.90
- **Effort = (0.33×0.5 + 0.33×0 + 0.33×0.90) × 21 = 9.7 / 21** (Moderate-Low)

**Example 2: Q2 (Medium, 50s), average student - normal work**
- Time: 40s / 50s = 0.8
- Help: 2 hints, no example → (2+0)/4 = 0.5
- Attention: 70% → 0.70
- **Effort = (0.33×0.8 + 0.33×0.5 + 0.33×0.70) × 21 = 13.86 / 21** (Moderate-High)

**Example 3: Q4 (Hard, 60s), struggling student - high effort**
- Time: Extra time used → 60s/60s = 1.0
- Help: 3 hints + example (penalty=0.01) → (3+1)/4 = 1.0
- Attention: 85% → 0.85 (working hard to focus)
- **Effort = (0.33×1.0 + 0.33×1.0 + 0.33×0.85) × 21 = 19.7 / 21** (Very High)

**Example 4: Q5 (Hard, 60s), distracted student - low effort**
- Time: 20s / 60s = 0.33
- Help: 1 hint, no example → (1+0)/4 = 0.25
- Attention: 30% → 0.30 (distracted)
- **Effort = (0.33×0.33 + 0.33×0.25 + 0.33×0.30) × 21 = 6.1 / 21** (Low)

**Example 5: Q3 (Medium, 50s), gave up - very low effort**
- Time: 25s / 50s = 0.5
- Help: 0 hints, no example → 0
- Attention: 20% → 0.20
- **Effort = (0.33×0.5 + 0.33×0 + 0.33×0.20) × 21 = 4.9 / 21** (Very Low)

**Example 6: Q4 (Hard, 60s), moderate student with missing attention data**
- Time: 45s / 60s = 0.75
- Help: 1 hint + example → (1+1)/4 = 0.5
- Attention: null → defaults to 50% → 0.50
- **Effort = (0.33×0.75 + 0.33×0.5 + 0.33×0.50) × 21 = 12.1 / 21** (Moderate)

**Example 7: Q1 (Easy, 30s), perfect focus but needed help**
- Time: 25s / 30s = 0.83
- Help: 2 hints, no example → (2+0)/4 = 0.5
- Attention: 95% → 0.95
- **Effort = (0.33×0.83 + 0.33×0.5 + 0.33×0.95) × 21 = 15.7 / 21** (High)

### Implementation Requirements

#### Implementation Location

Add function to `src/lib/nasaTlx.ts`:

```typescript
export function calculateEffort(
  time_ms: number,
  q_index: number,
  extra_time_used: boolean,
  hintsUsed: number,
  examplePenalty: number,      // From metrics.examplePenalty (0 or 0.01)
  attention_rate: number | null // From responses.attention_rate (percentage 0-100)
): number {
  const SCHEDULE = [
    { idx: 1, limit: 30 },
    { idx: 2, limit: 50 },
    { idx: 3, limit: 50 },
    { idx: 4, limit: 60 },
    { idx: 5, limit: 60 }
  ]

  const question = SCHEDULE.find(q => q.idx === q_index)
  if (!question) return 10.5  // Default to moderate if error

  // 1. Time component (0-1)
  const timeUsed = extra_time_used ? question.limit : time_ms / 1000
  const timeRatio = timeUsed / question.limit

  // 2. Help-seeking component (0-1)
  // Detect example usage from penalty value (0 = not used, >0 = used)
  const exampleUsed = examplePenalty > 0 ? 1 : 0
  // Max help: 3 hints + 1 example = 4 items
  const helpRatio = (hintsUsed + exampleUsed) / 4

  // 3. Attention component (0-1)
  // Direct: High attention = high effort invested
  // Use nullish coalescing (??) to default to 50% if null/undefined
  const attentionRatio = (attention_rate ?? 50) / 100

  // 4. Combine with equal weights (33.33% each)
  const effort = (
    0.33 * timeRatio +      // 33% - time invested
    0.33 * helpRatio +      // 33% - help needed
    0.33 * attentionRatio   // 33% - attention invested
  ) * 21

  return Math.max(0, Math.min(21, effort))
}
```

#### Data Flow

1. **Question Phase**: User answers question, system collects data
2. **Question End**: System has all required data:
   - `time_ms` from timer
   - `extra_time_used` flag
   - `hintsUsed` count
   - `examplePenalty` from metrics (0.01 if used, 0 if not)
   - `attention_rate` from attention tracking (may be null)
3. **Calculate Effort**: Use formula above with all components
4. **Response Save**: Store effort in `nasa_tlx_system.effort`

#### Notes

- **Example detection**: Uses `examplePenalty > 0` to detect if example was viewed (no database schema change needed)
- **Attention handling**: Uses nullish coalescing (`??`) to default to 50% if attention data is missing
- **Time handling**: If extra time used, assumes all original time was consumed (same logic as Temporal Demand)
- **Equal weights**: All three components contribute equally (0.33 each) for balanced measurement
- **Direct attention**: High attention = high effort (not inverted), reflecting focus and engagement
- **Help-seeking composite**: Combines hints and examples into single component (max 4 items total)

---

## Database Structure

### Table 1: `nasa_tlx_system` (System-Calculated per Question)

Stores system-calculated NASA-TLX dimensions for each question (5 rows per session).

```sql
CREATE TABLE nasa_tlx_system (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) NOT NULL,
  question_id INTEGER REFERENCES questions(id) NOT NULL,
  q_index INTEGER NOT NULL,  -- 1, 2, 3, 4, 5

  -- NASA-TLX Dimensions (0-21 scale)
  mental_demand DECIMAL(5,2) NOT NULL,
  physical_demand DECIMAL(5,2) NOT NULL,
  temporal_demand DECIMAL(5,2) NOT NULL,
  performance DECIMAL(5,2) NOT NULL,
  effort DECIMAL(5,2) NOT NULL,
  frustration DECIMAL(5,2) NOT NULL,

  -- Cognitive Load (calculated from 6 dimensions)
  cognitive_load DECIMAL(5,2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nasa_tlx_system_session ON nasa_tlx_system(session_id);
CREATE INDEX idx_nasa_tlx_system_question ON nasa_tlx_system(q_index);
```

**Cognitive Load Calculation (Per Question):**
```typescript
cognitive_load = (mental_demand + physical_demand + temporal_demand + performance + effort + frustration) / 6
```

### Table 2: `nasa_tlx_user` (User-Reported After Session)

Stores user's subjective ratings after completing all 5 questions (1 row per session).

```sql
CREATE TABLE nasa_tlx_user (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) UNIQUE NOT NULL,

  -- NASA-TLX Dimensions (0-21 scale) - User rates these 6
  mental_demand DECIMAL(5,2) NOT NULL,
  physical_demand DECIMAL(5,2) NOT NULL,
  temporal_demand DECIMAL(5,2) NOT NULL,
  performance DECIMAL(5,2) NOT NULL,
  effort DECIMAL(5,2) NOT NULL,
  frustration DECIMAL(5,2) NOT NULL,

  -- Overall Cognitive Load (CALCULATED from 6 dimensions above)
  cognitive_load DECIMAL(5,2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Cognitive Load Calculation (User):**
```typescript
cognitive_load = (mental_demand + physical_demand + temporal_demand + performance + effort + frustration) / 6
```

### Table 3: `cognitive_load_summary` (Session Aggregates)

Stores system weighted averages for comparison with user ratings (1 row per session).

```sql
CREATE TABLE cognitive_load_summary (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) UNIQUE NOT NULL,

  -- System: Weighted averages (weights: 0.1, 0.2, 0.2, 0.25, 0.25 by difficulty)
  sys_mental_demand DECIMAL(5,2) NOT NULL,
  sys_physical_demand DECIMAL(5,2) NOT NULL,
  sys_temporal_demand DECIMAL(5,2) NOT NULL,
  sys_performance DECIMAL(5,2) NOT NULL,
  sys_effort DECIMAL(5,2) NOT NULL,
  sys_frustration DECIMAL(5,2) NOT NULL,
  sys_cognitive_load DECIMAL(5,2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Weighted Average Calculation:**
```typescript
// Weights by question difficulty
const weights = [0.10, 0.20, 0.20, 0.25, 0.25]  // Q1, Q2, Q3, Q4, Q5

// For each dimension (e.g., mental_demand)
sys_mental_demand =
  0.10 * q1.mental_demand +
  0.20 * q2.mental_demand +
  0.20 * q3.mental_demand +
  0.25 * q4.mental_demand +
  0.25 * q5.mental_demand

// Same for all other dimensions and cognitive_load
```

**Why weighted average?**
- Harder questions (Q4, Q5) have more cognitive impact
- Users remember harder questions more (recency + intensity bias)
- Matches psychological reality of session experience

### Existing Table Updates

**Update `sessions` table:**
```sql
ALTER TABLE sessions ADD COLUMN environment_noise DECIMAL(5,2);
```

**Update `users` table:**
```sql
ALTER TABLE users ADD COLUMN profile_math_grade VARCHAR(20);
ALTER TABLE users ADD COLUMN profile_programming_grade VARCHAR(20);
```

---

## User Flow

### 1. Profile Setup (Before Any Session)
- User completes profile form
- Rates familiarity for each subtopic
- **NEW:** Selects Math grade (A, B, C, D, F, not_taken)
- **NEW:** Selects Programming grade (A, B, C, D, F, not_taken)
- Selects course experience and practice level

### 2. Session Start - Calibration
1. User starts calibration (60s breathing)
2. System calculates baseline RMSSD
3. **Existing UI shows**: "✓ Calibration Complete! RMSSD Baseline: 48.5ms" with "Start Task" button
4. **NEW:** Popup modal overlays on top: "How noisy/distracting is your current environment?"
5. User rates environment (0-21 slider)
6. User clicks "OK" → Save to `sessions.environment_noise`
7. Modal closes → User sees calibration complete screen again
8. User clicks "Start Task" button → Begin questions

### 3. Questions 1-5
For each question:
1. User answers question
2. System collects data (HR beats, attention, time, hints, etc.)
3. **Question ends** → System calculates all 6 NASA-TLX dimensions:
   - Mental Demand (preparedness vs difficulty)
   - Physical Demand (environment_noise from session)
   - Temporal Demand (TBD)
   - Performance (TBD)
   - Effort (TBD)
   - Frustration (HRV vs baseline)
4. Calculate cognitive load = average of 6 dimensions
5. Insert into `nasa_tlx_system` table

### 4. After Question 5 - User Survey
**NEW Survey Page (before report):**

Shows 6 sliders (0-21 each):
1. "How mentally demanding was this session overall?"
2. "How noisy/distracting was your environment during this session?"
3. "How much time pressure did you feel overall?"
4. "How well do you think you performed overall?"
5. "How hard did you have to work overall?"
6. "How frustrated did you feel overall?"

**NO overall cognitive load slider** - calculated automatically

User submits → System:
1. Calculate `user_cognitive_load = (sum of 6 dimensions) / 6`
2. Insert into `nasa_tlx_user` table
3. Calculate system weighted averages from `nasa_tlx_system` (5 questions)
4. Insert into `cognitive_load_summary` table
5. Redirect to report page

### 5. Report Page
Show comparison:
- System cognitive load (weighted) vs User cognitive load (calculated)
- System dimension averages (weighted) vs User dimension ratings
- Visualizations: radar chart, bar charts, side-by-side comparison
- **No differences calculated** - just show both values for user to interpret

---

## Implementation Timeline

1. ✅ Define and confirm Mental Demand formula
2. ✅ Define and confirm Physical Demand approach
3. ✅ Define and confirm Frustration formula
4. ✅ Define and confirm Temporal Demand formula
5. ✅ Define and confirm Performance formula
6. ✅ Define and confirm Effort formula
7. ✅ Create database migration scripts
8. ✅ Update database.ts TypeScript interfaces
9. ✅ Implement profile page grade questions
10. ✅ Implement calibration page environment modal
11. ✅ Create nasaTlx.ts utility functions
12. ✅ Integrate calculations into question end handlers
13. ⏳ Create NASA-TLX user survey page (NEXT)
14. ⏳ Update report page with comparisons
15. ⏳ Validate and correlate system predictions vs subjective ratings

---

## Notes

- All formulas use normalized 0-1 scale internally, then multiply by 21 at the end
- Weights and thresholds can be adjusted after validation
- Post-implementation validation will compare calculated values vs subjective NASA-TLX surveys
- System uses weighted averages (by difficulty) to match user's psychological experience
- User cognitive load is calculated from survey responses, not separately rated
