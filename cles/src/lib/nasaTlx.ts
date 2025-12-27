/**
 * NASA-TLX Cognitive Load Calculation Functions
 *
 * This module provides calculation functions for all 6 NASA-TLX dimensions:
 * 1. Mental Demand
 * 2. Physical Demand
 * 3. Temporal Demand
 * 4. Performance
 * 5. Effort
 * 6. Frustration
 *
 * All functions return values on the NASA-TLX scale (0-20).
 */

/**
 * Question schedule configuration
 * Defines time limits and point values for each question index
 */
const SCHEDULE = [
  { idx: 1, limit: 30, points: 1.0 },
  { idx: 2, limit: 50, points: 2.0 },
  { idx: 3, limit: 50, points: 2.0 },
  { idx: 4, limit: 60, points: 2.5 },
  { idx: 5, limit: 60, points: 2.5 }
] as const

/**
 * Calculate Mental Demand based on question difficulty and user preparedness
 *
 * Mental Demand = Task Difficulty × (1 - Preparedness) × 20
 *
 * @param difficulty - Question difficulty level ('E', 'M', 'H')
 * @param familiarity - User's familiarity with the subtopic ('none', 'basic', 'familiar', 'intermediate', 'advanced')
 * @param mathGrade - User's math course grade ('A', 'B', 'C', 'D', 'F', 'not_taken')
 * @param programmingGrade - User's programming course grade ('A', 'B', 'C', 'D', 'F', 'not_taken')
 * @param courseTaken - Whether user took the course ('yes', 'no', 'not_sure', null)
 * @param practiceLevel - User's hands-on practice level ('none', 'some_exercises', 'small_project', 'large_project', null)
 * @returns Mental demand score (0-20)
 */
export function calculateMentalDemand(
  difficulty: 'E' | 'M' | 'H',
  familiarity: string,
  mathGrade: string,
  programmingGrade: string,
  courseTaken: string | null,
  practiceLevel: string | null
): number {
  // Map values to 0-1 scale
  const familiarityMap: Record<string, number> = {
    none: 0,
    basic: 0.25,
    familiar: 0.5,
    intermediate: 0.75,
    advanced: 1.0
  }
  const gradeMap: Record<string, number> = {
    A: 1.0,
    B: 0.75,
    C: 0.5,
    D: 0.25,
    F: 0,
    not_taken: 0
  }
  const practiceLevelMap: Record<string, number> = {
    none: 0,
    some_exercises: 0.33,
    small_project: 0.66,
    large_project: 1.0
  }

  // Step 1: Prior Knowledge (50% familiarity + 25% math + 25% programming)
  const familiarityValue = familiarityMap[familiarity] || 0
  const mathGradeValue = gradeMap[mathGrade] || 0
  const programmingGradeValue = gradeMap[programmingGrade] || 0
  const priorKnowledge = 0.5 * familiarityValue + 0.25 * mathGradeValue + 0.25 * programmingGradeValue

  // Step 2: Experience Level (80% practice + 20% course taken)
  const courseTakenValue = (courseTaken === 'yes') ? 1 : 0
  const practiceLevelValue = practiceLevelMap[practiceLevel || ''] || 0
  const experienceLevel = 0.8 * practiceLevelValue + 0.2 * courseTakenValue

  // Step 3: Preparedness (60% prior knowledge + 40% experience)
  const preparedness = 0.6 * priorKnowledge + 0.4 * experienceLevel

  // Step 4: Task Difficulty
  const difficultyMap: Record<string, number> = { E: 0.33, M: 0.67, H: 1.0 }
  const difficultyValue = difficultyMap[difficulty] || 0.5

  // Step 5: Mental Demand
  const mentalDemand = (difficultyValue * (1 - preparedness)) * 20

  return Math.max(0, Math.min(20, mentalDemand))
}

/**
 * Calculate Physical Demand based on environment noise rating
 *
 * Physical Demand = Environment Noise (direct passthrough)
 *
 * @param environmentNoise - Environment noise rating from user (0-20)
 * @returns Physical demand score (0-20)
 */
export function calculatePhysicalDemand(environmentNoise: number): number {
  // Direct passthrough - no calculation needed
  return Math.max(0, Math.min(20, environmentNoise))
}

/**
 * Calculate Temporal Demand based on time used relative to time limit
 *
 * Temporal Demand = (Time Used / Original Limit) × 20
 *
 * @param time_ms - Time spent on question in milliseconds
 * @param q_index - Question index (1-5)
 * @param extra_time_used - Whether extra time was requested
 * @returns Temporal demand score (0-20)
 */
export function calculateTemporalDemand(
  time_ms: number,
  q_index: number,
  extra_time_used: boolean
): number {
  const question = SCHEDULE.find(q => q.idx === q_index)
  if (!question) return 0 // Error indicator - invalid question index

  const originalLimit = question.limit // seconds

  // If extra time was used, they must have used all original time
  const timeUsedOriginal = extra_time_used
    ? originalLimit
    : time_ms / 1000 // Convert milliseconds to seconds

  // Temporal demand (0-20 scale)
  const temporalDemand = (timeUsedOriginal / originalLimit) * 20

  return Math.max(0, Math.min(20, temporalDemand))
}

/**
 * Calculate Performance based on points awarded relative to max points
 *
 * Performance = (1 - Point Ratio) × 20
 * (Inverted: Perfect score = 0, Complete failure = 20)
 *
 * @param q_index - Question index (1-5)
 * @param pointsAwarded - Points awarded for the question
 * @returns Performance score (0-20)
 */
export function calculatePerformance(
  q_index: number,
  pointsAwarded: number
): number {
  const question = SCHEDULE.find(q => q.idx === q_index)
  if (!question) return 20 // Error indicator - invalid question, assume complete failure

  const maxPoints = question.points

  // Calculate point ratio (0-1)
  const pointRatio = pointsAwarded / maxPoints

  // Invert for NASA-TLX performance (0-20)
  // Perfect score (pointRatio = 1) → performance = 0
  // Complete failure (pointRatio = 0) → performance = 20
  const performance = (1 - pointRatio) * 20

  return Math.max(0, Math.min(20, performance))
}

/**
 * Calculate Effort based on time, help-seeking, and attention
 *
 * Effort = (0.33 × Time Ratio + 0.33 × Help Ratio + 0.33 × Attention Ratio) × 20
 *
 * @param time_ms - Time spent on question in milliseconds
 * @param q_index - Question index (1-5)
 * @param extra_time_used - Whether extra time was requested
 * @param hintsUsed - Number of hints used (0-3)
 * @param examplePenalty - Example penalty from metrics (0 or 0.01)
 * @param attention_rate - Attention rate percentage (0-100, may be null)
 * @returns Effort score (0-20)
 */
export function calculateEffort(
  time_ms: number,
  q_index: number,
  extra_time_used: boolean,
  hintsUsed: number,
  examplePenalty: number,
  attention_rate: number | null
): number {
  const question = SCHEDULE.find(q => q.idx === q_index)
  if (!question) return 10.5 // Default to moderate if error

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
    0.40 * timeRatio +      // 33% - time invested
    0.20 * helpRatio +      // 33% - help needed
    0.40 * attentionRatio   // 33% - attention invested
  ) * 20

  return Math.max(0, Math.min(20, effort))
}

/**
 * Calculate Frustration based on RMSSD (HRV) changes from baseline
 *
 * Frustration uses a bidirectional scale:
 * - RMSSD above baseline (relaxed) → Lower frustration (0-10.5)
 * - RMSSD below baseline (stressed) → Higher frustration (10.5-20)
 *
 * @param baselineRMSSD - Baseline RMSSD from calibration (ms)
 * @param questionRMSSD - RMSSD during question (ms)
 * @returns Frustration score (0-20)
 */
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
    const minRMSSD = baselineRMSSD * 0.3 // 30% floor
    const maxRange = baselineRMSSD - minRMSSD
    const frustration = NEUTRAL + (diff / maxRange) * NEUTRAL
    return Math.min(20, frustration)
  }
}

/**
 * Calculate User Cognitive Load from survey ratings
 *
 * User Cognitive Load = Average of 6 NASA-TLX dimensions
 *
 * @param ratings - User's ratings for all 6 NASA-TLX dimensions
 * @returns Cognitive load score (0-20)
 */
export function calculateUserCognitiveLoad(ratings: {
  mental_demand: number
  physical_demand: number
  temporal_demand: number
  performance: number
  effort: number
  frustration: number
}): number {
  return (
    ratings.mental_demand +
    ratings.physical_demand +
    ratings.temporal_demand +
    ratings.performance +
    ratings.effort +
    ratings.frustration
  ) / 6
}

/**
 * Calculate System Cognitive Load Summary from per-question NASA-TLX records
 *
 * Uses weighted sums based on question difficulty:
 * - Easy ('E') = 0.1 weight
 * - Medium ('M') = 0.2 weight
 * - Hard ('H') = 0.25 weight
 *
 * @param systemRecords - Array of nasa_tlx_system records with question difficulty
 * @returns Object with weighted sums for all 6 dimensions + cognitive load
 */
export function calculateSystemCognitiveLoadSummary(
  systemRecords: Array<{
    mental_demand: number
    physical_demand: number
    temporal_demand: number
    performance: number
    effort: number
    frustration: number
    question: { difficulty: 'E' | 'M' | 'H' }
  }>
): {
  sys_mental_demand: number
  sys_physical_demand: number
  sys_temporal_demand: number
  sys_performance: number
  sys_effort: number
  sys_frustration: number
  sys_cognitive_load: number
} {
  // Map difficulty directly from letter to weight
  function getWeight(difficulty: 'E' | 'M' | 'H'): number {
    if (difficulty === 'E') return 0.1   // Easy
    if (difficulty === 'H') return 0.25  // Hard
    return 0.2                           // Medium (default)
  }

  // Calculate weighted sums for all 6 dimensions
  let mentalSum = 0, physicalSum = 0, temporalSum = 0
  let performanceSum = 0, effortSum = 0, frustrationSum = 0

  systemRecords.forEach((record) => {
    const weight = getWeight(record.question.difficulty)
    mentalSum += record.mental_demand * weight
    physicalSum += record.physical_demand * weight
    temporalSum += record.temporal_demand * weight
    performanceSum += record.performance * weight
    effortSum += record.effort * weight
    frustrationSum += record.frustration * weight
  })

  // Calculate overall cognitive load as average of 6 dimension sums
  const cognitiveLoad = (
    mentalSum +
    physicalSum +
    temporalSum +
    performanceSum +
    effortSum +
    frustrationSum
  ) / 6

  return {
    sys_mental_demand: mentalSum,
    sys_physical_demand: physicalSum,
    sys_temporal_demand: temporalSum,
    sys_performance: performanceSum,
    sys_effort: effortSum,
    sys_frustration: frustrationSum,
    sys_cognitive_load: cognitiveLoad
  }
}
