# NASA-TLX Cognitive Load Calculation Formulas

## Overview

The Cognitive Load Estimation System (CLES) uses the **NASA Task Load Index (NASA-TLX)** methodology to assess cognitive load across six key dimensions. All calculations produce values on a **0-20 scale**, where higher values indicate greater load (except for Performance, which is inverted).

## Scale Information

- **Range**: 0-20 for all dimensions
- **Interpretation**:
  - **0-6**: Low demand/load
  - **7-13**: Medium demand/load
  - **14-20**: High demand/load

---

## The Six NASA-TLX Dimensions

### 1. Mental Demand

**Definition**: How much mental and perceptual activity was required for thinking, deciding, calculating, remembering, and problem-solving.

**Formula**:
```
Mental Demand = Task Difficulty × (1 - Preparedness) × 20
```

**Where**:

**Preparedness** is calculated as:
```
Preparedness = (0.6 × Prior Knowledge) + (0.4 × Experience Level)
```

**Prior Knowledge** combines:
```
Prior Knowledge = (0.5 × Familiarity) + (0.25 × Math Grade) + (0.25 × Programming Grade)
```

**Experience Level** combines:
```
Experience Level = (0.8 × Practice Level) + (0.2 × Course Taken)
```

**Task Difficulty** mapping:
- Easy (E): 0.33
- Medium (M): 0.67
- Hard (H): 1.0

**Component Mappings**:

| Familiarity | Value | Math/Prog Grade | Value | Practice Level | Value | Course Taken | Value |
|-------------|-------|-----------------|-------|----------------|-------|--------------|-------|
| None | 0.00 | A | 1.00 | None | 0.00 | Yes | 1.0 |
| Basic | 0.25 | B | 0.75 | Some Exercises | 0.33 | No | 0.0 |
| Familiar | 0.50 | C | 0.50 | Small Project | 0.66 | Not Sure | 0.0 |
| Intermediate | 0.75 | D | 0.25 | Large Project | 1.00 | | |
| Advanced | 1.00 | F / Not Taken | 0.00 | | | | |

**Example Calculation**:
```
Given:
- Difficulty = Hard (1.0)
- Familiarity = Basic (0.25)
- Math Grade = B (0.75)
- Programming Grade = C (0.50)
- Practice Level = Some Exercises (0.33)
- Course Taken = No (0.0)

Prior Knowledge = (0.5 × 0.25) + (0.25 × 0.75) + (0.25 × 0.50)
                = 0.125 + 0.1875 + 0.125
                = 0.4375

Experience Level = (0.8 × 0.33) + (0.2 × 0.0)
                 = 0.264 + 0
                 = 0.264

Preparedness = (0.6 × 0.4375) + (0.4 × 0.264)
             = 0.2625 + 0.1056
             = 0.3681

Mental Demand = 1.0 × (1 - 0.3681) × 20
              = 1.0 × 0.6319 × 20
              = 12.64
```

---

### 2. Physical Demand

**Definition**: How distracting was your environment? Was it noisy, uncomfortable, or did people interrupt you?

**Formula**:
```
Physical Demand = Environment Noise Rating (0-20)
```

**Details**:
- Direct passthrough from user's environment noise rating
- Collected at the start of each session
- No calculation required - uses the value as-is
- Clamped to 0-20 range

**Example**:
```
User rates environment noise as 8
→ Physical Demand = 8
```

---

### 3. Temporal Demand (Time Pressure)

**Definition**: How much time pressure did you feel due to the pace at which tasks occurred?

**Formula**:
```
Temporal Demand = (Time Used / Original Time Limit) × 20
```

**Time Limits by Question Index**:
| Question | Difficulty | Time Limit (seconds) | Max Points |
|----------|-----------|---------------------|-----------|
| Q1 | Easy | 30 | 1.0 |
| Q2 | Medium | 50 | 2.0 |
| Q3 | Medium | 50 | 2.0 |
| Q4 | Hard | 60 | 2.5 |
| Q5 | Hard | 60 | 2.5 |

**Special Cases**:
- If extra time was requested: Time Used = Original Time Limit (100% utilization)
- Time is measured in seconds (converted from milliseconds)

**Example Calculation**:
```
Given:
- Question 2 (Medium, 50s limit)
- Time spent = 42 seconds
- Extra time used = No

Temporal Demand = (42 / 50) × 20
                = 0.84 × 20
                = 16.8
```

---

### 4. Performance (Task Success)

**Definition**: How successful were you in accomplishing what you were asked to do?

**Formula**:
```
Performance = (1 - Point Ratio) × 20
```

**Where**:
```
Point Ratio = Points Awarded / Max Points for Question
```

**Important**: This dimension is **inverted** in NASA-TLX:
- Perfect score (full points) → Performance = 0 (low load)
- Complete failure (0 points) → Performance = 20 (high load)

**Example Calculation**:
```
Given:
- Question 4 (Max Points = 2.5)
- Points Awarded = 1.8

Point Ratio = 1.8 / 2.5 = 0.72

Performance = (1 - 0.72) × 20
            = 0.28 × 20
            = 5.6
```

---

### 5. Effort

**Definition**: How hard did you have to work (mentally and physically) to accomplish your level of performance?

**Formula**:
```
Effort = (0.40 × Time Ratio + 0.20 × Help Ratio + 0.40 × Attention Ratio) × 20
```

**Where**:

**Time Ratio**:
```
Time Ratio = Time Used / Original Time Limit
```

**Help Ratio**:
```
Help Ratio = (Hints Used + Example Used) / 4
```
- Hints Used: 0-3
- Example Used: 0 (not shown) or 1 (shown)
- Maximum possible help: 4 (3 hints + 1 example)

**Attention Ratio**:
```
Attention Ratio = Attention Rate / 100
```
- Attention Rate: Percentage of time user was attentive (0-100)
- Default: 50% if not available

**Example Calculation**:
```
Given:
- Question 3 (50s limit)
- Time Used = 48 seconds
- Extra Time = No
- Hints Used = 2
- Example Shown = Yes
- Attention Rate = 75%

Time Ratio = 48 / 50 = 0.96

Help Ratio = (2 + 1) / 4 = 0.75

Attention Ratio = 75 / 100 = 0.75

Effort = (0.40 × 0.96 + 0.20 × 0.75 + 0.40 × 0.75) × 20
       = (0.384 + 0.15 + 0.30) × 20
       = 0.834 × 20
       = 16.68
```

---

### 6. Frustration

**Definition**: How discouraged, stressed, irritated, or annoyed were you during the task?

**Formula**: Uses **Heart Rate Variability (HRV)** - specifically RMSSD measurements

**Bidirectional Scale**:
```
If RMSSD_question >= RMSSD_baseline (Relaxed):
    Frustration = 10.5 - ((RMSSD_question - RMSSD_baseline) / RMSSD_baseline) × 10.5

If RMSSD_question < RMSSD_baseline (Stressed):
    Frustration = 10.5 + ((RMSSD_baseline - RMSSD_question) / Max_Range) × 10.5
    where Max_Range = RMSSD_baseline - (RMSSD_baseline × 0.3)
```

**Neutral Point**: 10.5 (no change from baseline)

**Details**:
- RMSSD = Root Mean Square of Successive Differences (in milliseconds)
- Baseline RMSSD collected during calibration phase
- Question RMSSD calculated during each question
- Higher RMSSD = More relaxed → Lower frustration
- Lower RMSSD = More stressed → Higher frustration

**Example Calculations**:

*Relaxed State (RMSSD above baseline):*
```
Given:
- Baseline RMSSD = 50ms
- Question RMSSD = 60ms

Frustration = 10.5 - ((60 - 50) / 50) × 10.5
            = 10.5 - (10 / 50) × 10.5
            = 10.5 - (0.2 × 10.5)
            = 10.5 - 2.1
            = 8.4
```

*Stressed State (RMSSD below baseline):*
```
Given:
- Baseline RMSSD = 50ms
- Question RMSSD = 35ms
- Max Range = 50 - (50 × 0.3) = 50 - 15 = 35ms

Frustration = 10.5 + ((50 - 35) / 35) × 10.5
            = 10.5 + (15 / 35) × 10.5
            = 10.5 + (0.4286 × 10.5)
            = 10.5 + 4.5
            = 15.0
```

---

## Overall Cognitive Load Calculation

### Per-Question Cognitive Load

For each individual question, the cognitive load is calculated as the **average of all 6 dimensions**:

```
Cognitive Load_question = (Mental Demand + Physical Demand + Temporal Demand +
                          Performance + Effort + Frustration) / 6
```

**Example**:
```
Given for Question 1:
- Mental Demand = 12.5
- Physical Demand = 8.0
- Temporal Demand = 16.0
- Performance = 5.0
- Effort = 14.5
- Frustration = 9.2

Cognitive Load_Q1 = (12.5 + 8.0 + 16.0 + 5.0 + 14.5 + 9.2) / 6
                  = 65.2 / 6
                  = 10.87
```

---

### Session-Level Cognitive Load (Weighted Average)

For an entire session (5 questions), the system uses **weighted averaging** based on question difficulty:

**Difficulty Weights**:
- Easy (E): 0.1
- Medium (M): 0.2
- Hard (H): 0.25

**Formula for Each Dimension**:
```
Dimension_session = Σ (Dimension_question × Weight_question)
```

**Formula for Overall Session Cognitive Load**:
```
Cognitive Load_session = (Mental_session + Physical_session + Temporal_session +
                         Performance_session + Effort_session + Frustration_session) / 6
```

**Example Session Calculation**:

| Question | Difficulty | Weight | Mental | Physical | Temporal | Performance | Effort | Frustration |
|----------|-----------|--------|--------|----------|----------|-------------|--------|-------------|
| Q1 | Easy | 0.10 | 10.0 | 8.0 | 15.0 | 4.0 | 12.0 | 8.5 |
| Q2 | Medium | 0.20 | 13.0 | 8.0 | 18.0 | 6.0 | 15.0 | 11.0 |
| Q3 | Medium | 0.20 | 14.0 | 8.0 | 16.0 | 8.0 | 16.0 | 12.5 |
| Q4 | Hard | 0.25 | 16.0 | 8.0 | 19.0 | 12.0 | 18.0 | 15.0 |
| Q5 | Hard | 0.25 | 17.0 | 8.0 | 20.0 | 10.0 | 19.0 | 14.0 |

**Weighted Mental Demand**:
```
Mental_session = (10.0 × 0.10) + (13.0 × 0.20) + (14.0 × 0.20) + (16.0 × 0.25) + (17.0 × 0.25)
               = 1.0 + 2.6 + 2.8 + 4.0 + 4.25
               = 14.65
```

**Weighted Physical Demand**:
```
Physical_session = (8.0 × 0.10) + (8.0 × 0.20) + (8.0 × 0.20) + (8.0 × 0.25) + (8.0 × 0.25)
                 = 0.8 + 1.6 + 1.6 + 2.0 + 2.0
                 = 8.0
```

*(Continue for all dimensions...)*

**Overall Cognitive Load**:
```
Assuming:
Mental_session = 14.65
Physical_session = 8.0
Temporal_session = 17.65
Performance_session = 8.25
Effort_session = 16.25
Frustration_session = 12.50

Cognitive Load_session = (14.65 + 8.0 + 17.65 + 8.25 + 16.25 + 12.50) / 6
                       = 77.30 / 6
                       = 12.88
```

---

## User-Reported vs System-Calculated

### System Cognitive Load
- Calculated automatically per question using the formulas above
- Based on objective metrics: time, performance, HRV, attention, etc.
- Aggregated using weighted averaging for session summary

### User Cognitive Load
- Collected via post-session NASA-TLX survey
- User rates each of the 6 dimensions on 0-20 scale
- Simple average of 6 ratings (no weighting)

```
User Cognitive Load = (User_Mental + User_Physical + User_Temporal +
                       User_Performance + User_Effort + User_Frustration) / 6
```

---

## Summary Table

| Dimension | Primary Factors | Scale | Inverted? |
|-----------|----------------|-------|-----------|
| **Mental Demand** | Difficulty, Preparedness | 0-20 | No |
| **Physical Demand** | Environment Noise | 0-20 | No |
| **Temporal Demand** | Time Used vs. Limit | 0-20 | No |
| **Performance** | Points Awarded | 0-20 | **Yes** |
| **Effort** | Time, Help-Seeking, Attention | 0-20 | No |
| **Frustration** | HRV (RMSSD) Change | 0-20 | No |

---

## References

- **NASA-TLX**: Hart, S. G., & Staveland, L. E. (1988). Development of NASA-TLX (Task Load Index): Results of empirical and theoretical research. In P. A. Hancock & N. Meshkati (Eds.), Human mental workload (pp. 139-183). Amsterdam: North-Holland.

- **HRV/RMSSD**: Task Force of the European Society of Cardiology. (1996). Heart rate variability: Standards of measurement, physiological interpretation, and clinical use. Circulation, 93(5), 1043-1065.

---

**Document Version**: 1.0
**Last Updated**: December 2024
**System**: Cognitive Load Estimation System (CLES)
