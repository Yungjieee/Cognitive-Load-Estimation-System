// HRV Configuration Constants
// Single source of truth for all HRV-related thresholds and parameters

export const HRV_CONFIG = {
  // Baseline computation
  HRV_BASELINE_SECONDS: 15,
  
  // HRV labeling threshold
  HRV_HIGH_FACTOR: 1.15, // RMSSD_q >= 1.15 * RMSSD_base → 'high'
  
  // IBI filtering thresholds (in milliseconds)
  IBI_VALID_MIN: 300,     // Minimum valid IBI (300ms = 200 BPM max)
  IBI_VALID_MAX: 2000,   // Maximum valid IBI (2000ms = 30 BPM min)
  IBI_DELTA_MAX: 500,    // Maximum IBI change between consecutive beats (wider filtering)

  // Quality thresholds
  MIN_BEATS_PER_QUESTION: 10, // Minimum beats required for reliable HRV calculation

  // Session timing
  CALIBRATION_DURATION_MS: 15000, // 15 seconds for baseline (longer calibration)
} as const;

export type HRVLabel = 'high' | 'low';
export type HRVConfidence = 'ok' | 'low';

export interface HRVMetrics {
  hrv: HRVLabel;
  rmssd_q: number;
  rmssd_base: number;
  hrv_confidence: HRVConfidence;
}

export interface HRBeat {
  sessionId: number;
  ts: number;
  ibi_ms: number;
  bpm: number;
}
