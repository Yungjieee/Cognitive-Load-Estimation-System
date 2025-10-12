// Timer controller for CLES sessions
// Handles start/pause/extend functionality with 10s warning and timeout events

import { SCHEDULE, TEN_SECOND_WARNING_AT, EXTRA_TIME_FACTOR } from './config';

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number;
  originalLimit: number;
  hasWarned: boolean;
  hasTimedOut: boolean;
}

export type TimerEvent = 'start' | 'pause' | 'resume' | 'extend' | 'warning' | 'timeout' | 'tick';

export interface TimerCallbacks {
  onEvent?: (event: TimerEvent, state: TimerState) => void;
  onWarning?: (secondsLeft: number) => void;
  onTimeout?: () => void;
  onTick?: (secondsLeft: number) => void;
}

class TimerController {
  private state: TimerState = {
    isRunning: false,
    isPaused: false,
    timeRemaining: 0,
    originalLimit: 0,
    hasWarned: false,
    hasTimedOut: false
  };

  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: TimerCallbacks = {};

  // Initialize timer for a specific question
  initialize(questionIndex: number, callbacks: TimerCallbacks = {}): void {
    // Clear any existing interval first
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.callbacks = callbacks;
    
    const config = SCHEDULE[questionIndex];
    if (!config) {
      throw new Error(`Invalid question index: ${questionIndex}`);
    }

    this.state = {
      isRunning: false,
      isPaused: false,
      timeRemaining: config.limit,
      originalLimit: config.limit,
      hasWarned: false,
      hasTimedOut: false
    };

    this.callbacks.onEvent?.('start', this.state);
  }

  // Start the timer
  start(): void {
    if (this.state.isRunning || this.state.hasTimedOut) {
      return;
    }

    // Clear any existing interval before starting
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.state.isRunning = true;
    this.state.isPaused = false;

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);

    this.callbacks.onEvent?.('start', this.state);
  }

  // Pause the timer
  pause(): void {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }

    this.state.isPaused = true;
    this.state.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.callbacks.onEvent?.('pause', this.state);
  }

  // Resume the timer
  resume(): void {
    if (this.state.isRunning || !this.state.isPaused) {
      return;
    }

    this.state.isRunning = true;
    this.state.isPaused = false;

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);

    this.callbacks.onEvent?.('resume', this.state);
  }

  // Extend timer by 30% of original limit
  extend(): void {
    const extension = Math.floor(this.state.originalLimit * EXTRA_TIME_FACTOR);
    this.state.timeRemaining += extension;
    
    // Reset timeout flag if timer has run out
    if (this.state.hasTimedOut) {
      this.state.hasTimedOut = false;
      this.state.isPaused = false;
      this.state.isRunning = false;
      
      // Restart the timer
      this.start();
    }

    this.callbacks.onEvent?.('extend', this.state);
  }

  // Reset timer to original limit
  reset(): void {
    this.state.timeRemaining = this.state.originalLimit;
    this.state.hasWarned = false;
    this.state.hasTimedOut = false;
  }

  // Force stop the timer (for rapid transitions)
  forceStop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.state.isRunning = false;
    this.state.isPaused = false;
  }

  // Get current state
  getState(): TimerState {
    return { ...this.state };
  }

  // Get time remaining in MM:SS format
  getFormattedTime(): string {
    const minutes = Math.floor(this.state.timeRemaining / 60);
    const seconds = this.state.timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Check if timer is in warning state
  isInWarningState(): boolean {
    return this.state.timeRemaining <= TEN_SECOND_WARNING_AT && this.state.timeRemaining > 0;
  }

  // Check if timer has timed out
  hasTimedOut(): boolean {
    return this.state.hasTimedOut;
  }

  // Cleanup timer
  cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.state = {
      isRunning: false,
      isPaused: false,
      timeRemaining: 0,
      originalLimit: 0,
      hasWarned: false,
      hasTimedOut: false
    };
  }

  // Internal tick method
  private tick(): void {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }

    this.state.timeRemaining--;

    // Check for warning
    if (this.state.timeRemaining === TEN_SECOND_WARNING_AT && !this.state.hasWarned) {
      this.state.hasWarned = true;
      this.callbacks.onWarning?.(this.state.timeRemaining);
      this.callbacks.onEvent?.('warning', this.state);
    }

    // Check for timeout
    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.state.isRunning = false;
      this.state.hasTimedOut = true;

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      this.callbacks.onTimeout?.();
      this.callbacks.onEvent?.('timeout', this.state);
    } else {
      this.callbacks.onTick?.(this.state.timeRemaining);
      this.callbacks.onEvent?.('tick', this.state);
    }
  }
}

// Create a singleton instance
export const timerController = new TimerController();

// Export the class for testing
export { TimerController };
