// Event logging system for CLES sessions
// Tracks all user interactions and system events for analytics

import { EVENT_TYPES } from './constants';

export interface SessionEvent {
  id: string;
  sessionId: string;
  timestamp: number; // milliseconds since epoch
  type: string;
  payload: Record<string, any>;
  questionIndex?: number; // which question this event relates to
}

export interface EventPayload {
  // Stressor events
  stressor_show?: { message: string; questionIndex: number };
  stressor_dismiss?: { message: string; questionIndex: number };
  
  // Timing events
  ten_second_warning?: { questionIndex: number; timeRemaining: number };
  time_up_modal_open?: { questionIndex: number; timeRemaining: number };
  choose_extra_time?: { questionIndex: number; timeLimit: number; extraTime: number };
  choose_skip?: { questionIndex: number; timeRemaining: number };
  
  // Support events
  rest_suggest?: { questionIndex: number; reason: string };
  rest_start?: { questionIndex: number; duration: number };
  rest_resume?: { questionIndex: number; restDuration: number };
  hint_offer?: { questionIndex: number; hintType: 'hint' | 'example' };
  hint_open?: { questionIndex: number; hintType: 'hint' | 'example' };
  example_open?: { questionIndex: number };
  
  // Answer events
  answer_submit?: { 
    questionIndex: number; 
    correct: boolean; 
    timeSpent: number; 
    hintsUsed: number;
    pointsAwarded: number;
  };
  reveal_show?: { questionIndex: number; correct: boolean };
  next_click?: { questionIndex: number; dwellTime: number };
  
  // System events
  device_alert?: { device: 'webcam' | 'hr'; status: 'lost' | 'restored' };
  session_start?: { mode: 'support' | 'no_support'; subtopicId: string };
  session_end?: { totalScore: number; totalTime: number; questionsCompleted: number };
}

class EventLogger {
  private events: SessionEvent[] = [];
  private sessionId: string | null = null;

  // Initialize logger for a new session
  initialize(sessionId: string): void {
    this.sessionId = sessionId;
    this.events = [];
  }

  // Log an event
  logEvent(
    type: string, 
    payload: EventPayload, 
    questionIndex?: number
  ): void {
    if (!this.sessionId) {
      console.warn('EventLogger: No session initialized');
      return;
    }

    const event: SessionEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      type,
      payload,
      questionIndex
    };

    this.events.push(event);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Event logged:', event);
    }
  }

  // Convenience methods for common events
  logStressorShow(message: string, questionIndex: number): void {
    this.logEvent(EVENT_TYPES.STRESSOR_SHOW, { 
      stressor_show: { message, questionIndex } 
    }, questionIndex);
  }

  logStressorDismiss(message: string, questionIndex: number): void {
    this.logEvent(EVENT_TYPES.STRESSOR_DISMISS, { 
      stressor_dismiss: { message, questionIndex } 
    }, questionIndex);
  }

  logTenSecondWarning(questionIndex: number, timeRemaining: number): void {
    this.logEvent(EVENT_TYPES.TEN_SECOND_WARNING, { 
      ten_second_warning: { questionIndex, timeRemaining } 
    }, questionIndex);
  }

  logTimeUpModalOpen(questionIndex: number, timeRemaining: number): void {
    this.logEvent(EVENT_TYPES.TIME_UP_MODAL_OPEN, { 
      time_up_modal_open: { questionIndex, timeRemaining } 
    }, questionIndex);
  }

  logChooseExtraTime(questionIndex: number, timeLimit: number, extraTime: number): void {
    this.logEvent(EVENT_TYPES.CHOOSE_EXTRA_TIME, { 
      choose_extra_time: { questionIndex, timeLimit, extraTime } 
    }, questionIndex);
  }

  logChooseSkip(questionIndex: number, timeRemaining: number): void {
    this.logEvent(EVENT_TYPES.CHOOSE_SKIP, { 
      choose_skip: { questionIndex, timeRemaining } 
    }, questionIndex);
  }

  logRestSuggest(questionIndex: number, reason: string): void {
    this.logEvent(EVENT_TYPES.REST_SUGGEST, { 
      rest_suggest: { questionIndex, reason } 
    }, questionIndex);
  }

  logRestStart(questionIndex: number, duration: number): void {
    this.logEvent(EVENT_TYPES.REST_START, { 
      rest_start: { questionIndex, duration } 
    }, questionIndex);
  }

  logRestResume(questionIndex: number, restDuration: number): void {
    this.logEvent(EVENT_TYPES.REST_RESUME, { 
      rest_resume: { questionIndex, restDuration } 
    }, questionIndex);
  }

  logHintOffer(questionIndex: number, hintType: 'hint' | 'example'): void {
    this.logEvent(EVENT_TYPES.HINT_OFFER, { 
      hint_offer: { questionIndex, hintType } 
    }, questionIndex);
  }

  logHintOpen(questionIndex: number, hintType: 'hint' | 'example'): void {
    this.logEvent(EVENT_TYPES.HINT_OPEN, { 
      hint_open: { questionIndex, hintType } 
    }, questionIndex);
  }

  logExampleOpen(questionIndex: number): void {
    this.logEvent(EVENT_TYPES.EXAMPLE_OPEN, { 
      example_open: { questionIndex } 
    }, questionIndex);
  }

  logAnswerSubmit(
    questionIndex: number, 
    correct: boolean, 
    timeSpent: number, 
    hintsUsed: number,
    pointsAwarded: number
  ): void {
    this.logEvent(EVENT_TYPES.ANSWER_SUBMIT, { 
      answer_submit: { questionIndex, correct, timeSpent, hintsUsed, pointsAwarded } 
    }, questionIndex);
  }

  logRevealShow(questionIndex: number, correct: boolean): void {
    this.logEvent(EVENT_TYPES.REVEAL_SHOW, { 
      reveal_show: { questionIndex, correct } 
    }, questionIndex);
  }

  logNextClick(questionIndex: number, dwellTime: number): void {
    this.logEvent(EVENT_TYPES.NEXT_CLICK, { 
      next_click: { questionIndex, dwellTime } 
    }, questionIndex);
  }

  logDeviceAlert(device: 'webcam' | 'hr', status: 'lost' | 'restored'): void {
    this.logEvent(EVENT_TYPES.DEVICE_ALERT, { 
      device_alert: { device, status } 
    });
  }

  logSessionStart(mode: 'support' | 'no_support', subtopicId: string): void {
    this.logEvent(EVENT_TYPES.SESSION_START, { 
      session_start: { mode, subtopicId } 
    });
  }

  logSessionEnd(totalScore: number, totalTime: number, questionsCompleted: number): void {
    this.logEvent(EVENT_TYPES.SESSION_END, { 
      session_end: { totalScore, totalTime, questionsCompleted } 
    });
  }

  // Get all events
  getEvents(): SessionEvent[] {
    return [...this.events];
  }

  // Get events for a specific question
  getEventsForQuestion(questionIndex: number): SessionEvent[] {
    return this.events.filter(event => event.questionIndex === questionIndex);
  }

  // Get events by type
  getEventsByType(type: string): SessionEvent[] {
    return this.events.filter(event => event.type === type);
  }

  // Clear all events (useful for testing)
  clear(): void {
    this.events = [];
  }

  // Export events as JSON
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  // Get session summary
  getSessionSummary(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    totalTime: number;
    questionsWithEvents: number[];
  } {
    const eventsByType: Record<string, number> = {};
    const questionsWithEvents = new Set<number>();
    let totalTime = 0;

    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      if (event.questionIndex !== undefined) {
        questionsWithEvents.add(event.questionIndex);
      }
    });

    if (this.events.length > 0) {
      const firstEvent = this.events[0];
      const lastEvent = this.events[this.events.length - 1];
      totalTime = lastEvent.timestamp - firstEvent.timestamp;
    }

    return {
      totalEvents: this.events.length,
      eventsByType,
      totalTime,
      questionsWithEvents: Array.from(questionsWithEvents).sort()
    };
  }
}

// Create a singleton instance
export const eventLogger = new EventLogger();

// Export the class for testing
export { EventLogger };


