// HRV Aggregation Logic
// Computes RMSSD baseline and per-question HRV metrics

import { HRV_CONFIG, type HRVMetrics, type HRVLabel, type HRVConfidence } from './hrvConfig';

export interface ProcessedIBI {
  ibi_ms: number;
  timestamp: number;
}

export interface HRVAggregator {
  sessionId: number;
  baselineRMSSD: number | null;
  baselineConfidence: HRVConfidence;
  questionBoundaries: Map<number, { start: number; end: number }>;
}

/**
 * Filters IBI data to remove artifacts and invalid readings
 */
export function filterIBIs(ibis: ProcessedIBI[]): ProcessedIBI[] {
  if (ibis.length === 0) return [];
  
  const filtered: ProcessedIBI[] = [];
  
  for (let i = 0; i < ibis.length; i++) {
    const ibi = ibis[i];
    
    // Check basic validity
    if (ibi.ibi_ms < HRV_CONFIG.IBI_VALID_MIN || ibi.ibi_ms > HRV_CONFIG.IBI_VALID_MAX) {
      continue;
    }
    
    // Check delta from previous beat (if exists)
    if (i > 0) {
      const prevIbi = filtered[filtered.length - 1];
      const delta = Math.abs(ibi.ibi_ms - prevIbi.ibi_ms);
      if (delta > HRV_CONFIG.IBI_DELTA_MAX) {
        continue;
      }
    }
    
    filtered.push(ibi);
  }
  
  return filtered;
}

/**
 * Computes RMSSD (Root Mean Square of Successive Differences) from IBI data
 */
export function computeRMSSD(ibis: ProcessedIBI[]): number {
  if (ibis.length < 2) return 0;
  
  let sumSquaredDiffs = 0;
  let validDiffs = 0;
  
  for (let i = 1; i < ibis.length; i++) {
    const diff = ibis[i].ibi_ms - ibis[i - 1].ibi_ms;
    sumSquaredDiffs += diff * diff;
    validDiffs++;
  }
  
  if (validDiffs === 0) return 0;
  
  const meanSquaredDiff = sumSquaredDiffs / validDiffs;
  return Math.sqrt(meanSquaredDiff);
}

/**
 * Computes baseline RMSSD from calibration period (first 10 seconds)
 */
export function computeBaselineRMSSD(
  ibis: ProcessedIBI[], 
  calibrationEndMs: number
): { rmssd: number; confidence: HRVConfidence } {
  // Filter IBIs to calibration period
  const calibrationIBIs = ibis.filter(ibi => ibi.timestamp <= calibrationEndMs);
  const filteredIBIs = filterIBIs(calibrationIBIs);
  
  if (filteredIBIs.length < HRV_CONFIG.MIN_BEATS_PER_QUESTION) {
    return {
      rmssd: 0,
      confidence: 'low'
    };
  }
  
  const rmssd = computeRMSSD(filteredIBIs);
  return {
    rmssd,
    confidence: 'ok'
  };
}

/**
 * Computes per-question RMSSD and HRV label
 */
export function computeQuestionHRV(
  ibis: ProcessedIBI[],
  questionStartMs: number,
  questionEndMs: number,
  baselineRMSSD: number
): HRVMetrics {
  // Filter IBIs to question period
  const questionIBIs = ibis.filter(
    ibi => ibi.timestamp >= questionStartMs && ibi.timestamp <= questionEndMs
  );
  const filteredIBIs = filterIBIs(questionIBIs);
  
  if (filteredIBIs.length < HRV_CONFIG.MIN_BEATS_PER_QUESTION) {
    return {
      hrv: 'low',
      rmssd_q: 0,
      rmssd_base: baselineRMSSD,
      hrv_confidence: 'low'
    };
  }
  
  const rmssd_q = computeRMSSD(filteredIBIs);
  const threshold = baselineRMSSD * HRV_CONFIG.HRV_HIGH_FACTOR;
  const hrv: HRVLabel = rmssd_q >= threshold ? 'high' : 'low';
  
  return {
    hrv,
    rmssd_q,
    rmssd_base: baselineRMSSD,
    hrv_confidence: 'ok'
  };
}

/**
 * Creates a new HRV aggregator for a session
 */
export function createHRVAggregator(sessionId: number): HRVAggregator {
  return {
    sessionId,
    baselineRMSSD: null,
    baselineConfidence: 'low',
    questionBoundaries: new Map()
  };
}

/**
 * Adds question boundary to aggregator
 */
export function addQuestionBoundary(
  aggregator: HRVAggregator,
  qIndex: number,
  timestamp: number,
  eventType: 'question_start' | 'question_end'
): void {
  if (!aggregator.questionBoundaries.has(qIndex)) {
    aggregator.questionBoundaries.set(qIndex, { start: 0, end: 0 });
  }
  
  const boundary = aggregator.questionBoundaries.get(qIndex)!;
  
  if (eventType === 'question_start') {
    boundary.start = timestamp;
  } else {
    boundary.end = timestamp;
  }
}

/**
 * Processes all HRV metrics for a completed session
 */
export function processSessionHRV(
  aggregator: HRVAggregator,
  allIBIs: ProcessedIBI[]
): Map<number, HRVMetrics> {
  const results = new Map<number, HRVMetrics>();
  
  if (!aggregator.baselineRMSSD || aggregator.baselineRMSSD === 0) {
    // No baseline available, mark all questions as low confidence
    for (let qIndex = 1; qIndex <= 5; qIndex++) {
      results.set(qIndex, {
        hrv: 'low',
        rmssd_q: 0,
        rmssd_base: 0,
        hrv_confidence: 'low'
      });
    }
    return results;
  }
  
  // Process each question
  for (let qIndex = 1; qIndex <= 5; qIndex++) {
    const boundary = aggregator.questionBoundaries.get(qIndex);
    
    if (!boundary || boundary.start === 0 || boundary.end === 0) {
      // Missing boundary data
      results.set(qIndex, {
        hrv: 'low',
        rmssd_q: 0,
        rmssd_base: aggregator.baselineRMSSD,
        hrv_confidence: 'low'
      });
      continue;
    }
    
    const metrics = computeQuestionHRV(
      allIBIs,
      boundary.start,
      boundary.end,
      aggregator.baselineRMSSD
    );
    
    results.set(qIndex, metrics);
  }
  
  return results;
}
