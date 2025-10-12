// Configuration constants for CLES sessions module
// Single source of truth for all penalties, timings, and scoring rules

export const SCHEDULE = [
  { idx: 1,  level: 'easy',   limit: 30, points: 5 },
  { idx: 2,  level: 'easy',   limit: 30, points: 5 },
  { idx: 3,  level: 'easy',   limit: 30, points: 5 },
  { idx: 4,  level: 'easy',   limit: 30, points: 5 },
  { idx: 5,  level: 'medium', limit: 50, points: 10 },
  { idx: 6,  level: 'medium', limit: 50, points: 10 },
  { idx: 7,  level: 'medium', limit: 50, points: 10 },
  { idx: 8,  level: 'hard',   limit: 70, points: 15 },
  { idx: 9,  level: 'hard',   limit: 70, points: 15 },
  { idx: 10, level: 'hard',   limit: 70, points: 20 },
] as const;

export const PENALTY_HINT_PER_USE = 1;     // per hint (question-level)
export const PENALTY_EXTRA_TIME_TOTAL = 2; // per question (total-level)
export const EXTRA_TIME_FACTOR = 0.30;     // +30% of original limit
export const REST_MIN_MS = 60_000;         // 60s (support only)
export const REST_MAX_MS = 120_000;        // 120s (support only)
export const TEN_SECOND_WARNING_AT = 10;   // seconds left
export const STRESSOR_WINDOW = [0.25, 0.50];

// Stressor prompt messages
export const STRESSOR_MESSAGES = [
  "99% of students answered this correctly. Can you?",
  "This one should be easy. Don't overthink it.",
  "Tick-tock — others finished in half the time.",
  "Your instructor is reviewing timings on this one."
] as const;

// Encouragement messages
export const ENCOURAGEMENT_MESSAGES = {
  correct: [
    "Nice work — keep the momentum!",
    "Excellent! You're on the right track.",
    "Great job! Keep up the good work.",
    "Perfect! You're mastering this topic."
  ],
  incorrect: [
    "Review the definition and try the next one.",
    "Don't worry, learning takes practice.",
    "Take a moment to think about the concept.",
    "You're making progress — keep going!"
  ]
} as const;

// Event types for logging
export const EVENT_TYPES = {
  STRESSOR_SHOW: 'stressor_show',
  STRESSOR_DISMISS: 'stressor_dismiss',
  TEN_SECOND_WARNING: 'ten_second_warning',
  TIME_UP_MODAL_OPEN: 'time_up_modal_open',
  CHOOSE_EXTRA_TIME: 'choose_extra_time',
  CHOOSE_SKIP: 'choose_skip',
  REST_SUGGEST: 'rest_suggest',
  REST_START: 'rest_start',
  REST_RESUME: 'rest_resume',
  HINT_OFFER: 'hint_offer',
  HINT_OPEN: 'hint_open',
  EXAMPLE_OPEN: 'example_open',
  ANSWER_SUBMIT: 'answer_submit',
  REVEAL_SHOW: 'reveal_show',
  NEXT_CLICK: 'next_click',
  DEVICE_ALERT: 'device_alert',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end'
} as const;

// Mock HR configuration
export const MOCK_HR_BASE = 75;
export const MOCK_HR_NOISE = 8;

// Cognitive load calculation weights
export const COGNITIVE_LOAD_WEIGHTS = {
  w1: 0.3, // attention weight
  w2: 0.2, // extraneous weight  
  w3: 0.3, // intrinsic weight
  w4: 0.2  // germane weight
} as const;
