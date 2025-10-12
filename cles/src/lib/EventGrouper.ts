// Event grouper for CLES sessions
// Groups events by question for report display with counts instead of spammy timestamps

import { EVENT_TYPES } from './config';

export interface SessionEvent {
  id: string;
  timestamp: number;
  type: string;
  questionIndex: number;
  payload: any;
}

export interface QuestionEventSummary {
  questionIndex: number;
  questionId: string;
  events: {
    stressorShow: number;
    stressorDismiss: number;
    tenSecondWarning: number;
    timeUpModalOpen: number;
    chooseExtraTime: number;
    chooseSkip: number;
    restSuggest: number;
    restStart: number;
    restResume: number;
    hintOffer: number;
    hintOpen: number;
    exampleOpen: number;
    answerSubmit: number;
    revealShow: number;
    nextClick: number;
    deviceAlert: number;
  };
  totalEvents: number;
  timeSpent: number;
  hintsUsed: number;
  extraTimeUsed: boolean;
  skipped: boolean;
  pointsAwarded: number;
}

export interface SessionEventSummary {
  sessionId: string;
  totalQuestions: number;
  questions: QuestionEventSummary[];
  sessionEvents: {
    sessionStart: number;
    sessionEnd: number;
  };
  totalEvents: number;
  totalTimeSpent: number;
  totalPoints: number;
}

class EventGrouper {
  // Group events by question for report display
  groupEventsByQuestion(events: SessionEvent[]): QuestionEventSummary[] {
    const questionGroups = new Map<number, SessionEvent[]>();
    
    // Group events by question index
    events.forEach(event => {
      if (!questionGroups.has(event.questionIndex)) {
        questionGroups.set(event.questionIndex, []);
      }
      questionGroups.get(event.questionIndex)!.push(event);
    });

    // Convert to summary format
    const summaries: QuestionEventSummary[] = [];
    
    questionGroups.forEach((questionEvents, questionIndex) => {
      const summary = this.createQuestionSummary(questionIndex, questionEvents);
      summaries.push(summary);
    });

    // Sort by question index
    return summaries.sort((a, b) => a.questionIndex - b.questionIndex);
  }

  // Create summary for a single question
  private createQuestionSummary(questionIndex: number, events: SessionEvent[]): QuestionEventSummary {
    const eventCounts = {
      stressorShow: 0,
      stressorDismiss: 0,
      tenSecondWarning: 0,
      timeUpModalOpen: 0,
      chooseExtraTime: 0,
      chooseSkip: 0,
      restSuggest: 0,
      restStart: 0,
      restResume: 0,
      hintOffer: 0,
      hintOpen: 0,
      exampleOpen: 0,
      answerSubmit: 0,
      revealShow: 0,
      nextClick: 0,
      deviceAlert: 0
    };

    let timeSpent = 0;
    let hintsUsed = 0;
    let extraTimeUsed = false;
    let skipped = false;
    let pointsAwarded = 0;
    let questionId = '';

    // Count events and extract data
    events.forEach(event => {
      switch (event.type) {
        case EVENT_TYPES.STRESSOR_SHOW:
          eventCounts.stressorShow++;
          break;
        case EVENT_TYPES.STRESSOR_DISMISS:
          eventCounts.stressorDismiss++;
          break;
        case EVENT_TYPES.TEN_SECOND_WARNING:
          eventCounts.tenSecondWarning++;
          break;
        case EVENT_TYPES.TIME_UP_MODAL_OPEN:
          eventCounts.timeUpModalOpen++;
          break;
        case EVENT_TYPES.CHOOSE_EXTRA_TIME:
          eventCounts.chooseExtraTime++;
          extraTimeUsed = true;
          break;
        case EVENT_TYPES.CHOOSE_SKIP:
          eventCounts.chooseSkip++;
          skipped = true;
          break;
        case EVENT_TYPES.REST_SUGGEST:
          eventCounts.restSuggest++;
          break;
        case EVENT_TYPES.REST_START:
          eventCounts.restStart++;
          break;
        case EVENT_TYPES.REST_RESUME:
          eventCounts.restResume++;
          break;
        case EVENT_TYPES.HINT_OFFER:
          eventCounts.hintOffer++;
          break;
        case EVENT_TYPES.HINT_OPEN:
          eventCounts.hintOpen++;
          hintsUsed++;
          break;
        case EVENT_TYPES.EXAMPLE_OPEN:
          eventCounts.exampleOpen++;
          hintsUsed++;
          break;
        case EVENT_TYPES.ANSWER_SUBMIT:
          eventCounts.answerSubmit++;
          if (event.payload?.timeSpent) {
            timeSpent = event.payload.timeSpent;
          }
          if (event.payload?.pointsAwarded) {
            pointsAwarded = event.payload.pointsAwarded;
          }
          break;
        case EVENT_TYPES.REVEAL_SHOW:
          eventCounts.revealShow++;
          break;
        case EVENT_TYPES.NEXT_CLICK:
          eventCounts.nextClick++;
          break;
        case EVENT_TYPES.DEVICE_ALERT:
          eventCounts.deviceAlert++;
          break;
      }

      // Extract question ID from first event
      if (!questionId && event.payload?.questionId) {
        questionId = event.payload.questionId;
      }
    });

    return {
      questionIndex,
      questionId,
      events: eventCounts,
      totalEvents: events.length,
      timeSpent,
      hintsUsed,
      extraTimeUsed,
      skipped,
      pointsAwarded
    };
  }

  // Create complete session summary
  createSessionSummary(sessionId: string, events: SessionEvent[]): SessionEventSummary {
    const questionSummaries = this.groupEventsByQuestion(events);
    
    // Count session-level events
    const sessionEvents = {
      sessionStart: events.filter(e => e.type === EVENT_TYPES.SESSION_START).length,
      sessionEnd: events.filter(e => e.type === EVENT_TYPES.SESSION_END).length
    };

    // Calculate totals
    const totalEvents = events.length;
    const totalTimeSpent = questionSummaries.reduce((sum, q) => sum + q.timeSpent, 0);
    const totalPoints = questionSummaries.reduce((sum, q) => sum + q.pointsAwarded, 0);

    return {
      sessionId,
      totalQuestions: questionSummaries.length,
      questions: questionSummaries,
      sessionEvents,
      totalEvents,
      totalTimeSpent,
      totalPoints
    };
  }

  // Get human-readable event summary for a question
  getQuestionEventSummary(summary: QuestionEventSummary): string[] {
    const events: string[] = [];

    if (summary.events.hintOpen > 0) {
      events.push(`Hints used: ${summary.events.hintOpen}`);
    }
    if (summary.events.exampleOpen > 0) {
      events.push(`Examples used: ${summary.events.exampleOpen}`);
    }
    if (summary.events.chooseExtraTime > 0) {
      events.push(`Extra time requested: ${summary.events.chooseExtraTime}`);
    }
    if (summary.events.chooseSkip > 0) {
      events.push(`Question skipped`);
    }
    if (summary.events.tenSecondWarning > 0) {
      events.push(`Time warnings: ${summary.events.tenSecondWarning}`);
    }
    if (summary.events.stressorShow > 0) {
      events.push(`Stressor shown: ${summary.events.stressorShow}`);
    }
    if (summary.events.restStart > 0) {
      events.push(`Rest taken: ${summary.events.restStart}`);
    }
    if (summary.events.deviceAlert > 0) {
      events.push(`Device alerts: ${summary.events.deviceAlert}`);
    }

    return events;
  }

  // Get performance insights from event data
  getPerformanceInsights(summary: SessionEventSummary): {
    strugglingQuestions: number[];
    timeManagementIssues: number[];
    hintDependency: number[];
    stressIndicators: number[];
  } {
    const strugglingQuestions: number[] = [];
    const timeManagementIssues: number[] = [];
    const hintDependency: number[] = [];
    const stressIndicators: number[] = [];

    summary.questions.forEach(question => {
      // Questions with many hints used
      if (question.events.hintOpen + question.events.exampleOpen >= 2) {
        hintDependency.push(question.questionIndex);
      }

      // Questions with time warnings or extra time
      if (question.events.tenSecondWarning > 0 || question.events.chooseExtraTime > 0) {
        timeManagementIssues.push(question.questionIndex);
      }

      // Questions with stressor interactions
      if (question.events.stressorShow > 0) {
        stressIndicators.push(question.questionIndex);
      }

      // Questions that were skipped or took rest
      if (question.events.chooseSkip > 0 || question.events.restStart > 0) {
        strugglingQuestions.push(question.questionIndex);
      }
    });

    return {
      strugglingQuestions,
      timeManagementIssues,
      hintDependency,
      stressIndicators
    };
  }
}

// Create a singleton instance
export const eventGrouper = new EventGrouper();

// Export the class for testing
export { EventGrouper };
