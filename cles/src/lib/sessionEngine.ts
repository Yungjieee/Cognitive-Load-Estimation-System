// Session engine for CLES sessions
// Implements the complete flow according to the specification

import { SCHEDULE, PENALTY_HINT_PER_USE, PENALTY_EXTRA_TIME_TOTAL, EXTRA_TIME_FACTOR, EVENT_TYPES } from './config';
import { MOCK_QUESTIONS } from './mockQuestions';
import { Question, Answer } from './questionTypes';
import { timerController } from './TimerController';
import { eventLogger } from './eventLogger';
import { liveStreamsManager } from './liveStreams';

export interface SessionState {
  sessionId: string;
  userId: string;
  subtopicId: string;
  mode: 'support' | 'no_support';
  questions: Question[];
  currentQuestionIndex: number;
  timeRemaining: number;
  originalTimeLimit: number;
  extendedTimeLimit: number;
  isPaused: boolean;
  showReveal: boolean;
  showTimeUpModal: boolean;
  showStressor: boolean;
  stressorMessage: string;
  showSkipConfirmation: boolean;
  showExtraTimeFeedback: boolean;
  extraTimeAdded: number;
  hintsUsed: number[];
  extraTimeUsed: boolean[];
  scores: number[];
  totalScore: number;
  totalPenalties: number;
  events: any[];
  isCompleted: boolean;
}

export interface SessionResult {
  sessionId: string;
  totalScore: number;
  percentage: number;
  questionsAnswered: number;
  questionsSkipped: number;
  hintsUsed: number;
  extraTimeRequests: number;
  events: any[];
}

class SessionEngine {
  private state: SessionState | null = null;
  private stateUpdateCallback: ((state: SessionState) => void) | null = null;
  private stressorTimeout: NodeJS.Timeout | null = null;

  // Initialize session
  initialize(
    sessionId: string,
    userId: string,
    subtopicId: string,
    mode: 'support' | 'no_support',
    onStateUpdate: (state: SessionState) => void
  ): SessionState {
    // Get 10 questions for the session (mock implementation)
    const questions = this.selectQuestions(subtopicId);

    this.state = {
      sessionId,
      userId,
      subtopicId,
      mode,
      questions,
      currentQuestionIndex: 0,
      timeRemaining: SCHEDULE[0].limit,
      originalTimeLimit: SCHEDULE[0].limit,
      extendedTimeLimit: SCHEDULE[0].limit,
      isPaused: false,
      showReveal: false,
      showTimeUpModal: false,
      showStressor: false,
      stressorMessage: '',
      showSkipConfirmation: false,
      showExtraTimeFeedback: false,
      extraTimeAdded: 0,
      hintsUsed: new Array(10).fill(0),
      extraTimeUsed: new Array(10).fill(false),
      scores: new Array(10).fill(0),
      totalScore: 0,
      totalPenalties: 0,
      events: [],
      isCompleted: false
    };

    this.stateUpdateCallback = onStateUpdate;

    // Initialize timer
    timerController.initialize(0, {
      onEvent: (event, timerState) => {
        this.handleTimerEvent(event, timerState);
      },
      onWarning: (secondsLeft) => {
        this.handleTenSecondWarning(secondsLeft);
      },
      onTimeout: () => {
        this.handleTimeout();
      }
    });

    // Log session start
    this.logEvent(EVENT_TYPES.SESSION_START, {
      sessionId,
      userId,
      subtopicId,
      mode,
      questionCount: questions.length
    });

    // Start first question
    this.startQuestion();

    return this.getState();
  }

  // Get current state
  getState(): SessionState {
    if (!this.state) {
      throw new Error('Session not initialized');
    }
    return { ...this.state };
  }

  // Start a question
  private startQuestion(): void {
    if (!this.state) return;

    const questionIndex = this.state.currentQuestionIndex;
    const config = SCHEDULE[questionIndex];
    
    // Clear any existing stressor timeout
    if (this.stressorTimeout) {
      clearTimeout(this.stressorTimeout);
      this.stressorTimeout = null;
    }
    
    // Reset question state
    this.state.showReveal = false;
    this.state.showTimeUpModal = false;
    this.state.showStressor = false;
    this.state.showSkipConfirmation = false;
    this.state.showExtraTimeFeedback = false;
    this.state.extraTimeAdded = 0;
    this.state.isPaused = false;
    
    // Set time limits for this question
    this.state.originalTimeLimit = config.limit;
    this.state.extendedTimeLimit = config.limit;

    // Force stop any existing timer first
    timerController.forceStop();
    
    // Initialize timer for this question (this will dispose any previous interval)
    timerController.initialize(questionIndex, {
      onEvent: (event, timerState) => {
        this.handleTimerEvent(event, timerState);
      },
      onWarning: (secondsLeft) => {
        this.handleTenSecondWarning(secondsLeft);
      },
      onTimeout: () => {
        this.handleTimeout();
      }
    });

    // Start timer
    timerController.start();

    // Schedule stressor banner
    this.scheduleStressorBanner();

    this.updateState();
  }

  // Schedule stressor banner to appear at random time
  private scheduleStressorBanner(): void {
    if (!this.state || this.state.mode === 'no_support') return;

    const config = SCHEDULE[this.state.currentQuestionIndex];
    const minTime = config.limit * 0.25;
    const maxTime = config.limit * 0.50;
    const showTime = minTime + Math.random() * (maxTime - minTime);

    this.stressorTimeout = setTimeout(() => {
      if (this.state && !this.state.showReveal && !this.state.showTimeUpModal) {
        this.state.showStressor = true;
        this.state.stressorMessage = this.getRandomStressorMessage();
        this.updateState();

        this.logEvent(EVENT_TYPES.STRESSOR_SHOW, {
          questionIndex: this.state.currentQuestionIndex,
          message: this.state.stressorMessage
        });
      }
    }, showTime * 1000);
  }

  // Get random stressor message
  private getRandomStressorMessage(): string {
    const messages = [
      "99% of students answered this correctly. Can you?",
      "This one should be easy. Don't overthink it.",
      "Tick-tock — others finished in half the time.",
      "Your instructor is reviewing timings on this one."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Handle timer events
  private handleTimerEvent(event: string, timerState: any): void {
    if (!this.state) return;

    this.state.timeRemaining = timerState.timeRemaining;
    this.state.isPaused = timerState.isPaused;

    this.updateState();
  }

  // Handle 10-second warning
  private handleTenSecondWarning(secondsLeft: number): void {
    if (!this.state) return;

    this.logEvent(EVENT_TYPES.TEN_SECOND_WARNING, {
      questionIndex: this.state.currentQuestionIndex,
      secondsLeft
    });

    this.updateState();
  }

  // Handle timeout
  private handleTimeout(): void {
    if (!this.state) return;

    this.state.showTimeUpModal = true;
    this.state.isPaused = true;

    this.logEvent(EVENT_TYPES.TIME_UP_MODAL_OPEN, {
      questionIndex: this.state.currentQuestionIndex
    });

    this.updateState();
  }

  // Submit answer
  submitAnswer(answer: Answer): void {
    if (!this.state || this.state.showReveal) return;

    // Pause timer
    timerController.pause();

    // Check if answer is correct
    const isCorrect = this.checkAnswer(answer);
    const questionIndex = this.state.currentQuestionIndex;
    const config = SCHEDULE[questionIndex];
    
    // Calculate points awarded
    const hintPenalty = this.state.hintsUsed[questionIndex] * PENALTY_HINT_PER_USE;
    const pointsAwarded = isCorrect ? Math.max(0, config.points - hintPenalty) : 0;
    
    this.state.scores[questionIndex] = pointsAwarded;
    this.state.totalScore += pointsAwarded;

    // Show reveal
    this.state.showReveal = true;
    this.state.isPaused = true;

    // Log answer submission
    this.logEvent(EVENT_TYPES.ANSWER_SUBMIT, {
      questionIndex,
      answer,
      isCorrect,
      pointsAwarded,
      hintsUsed: this.state.hintsUsed[questionIndex],
      timeSpent: config.limit - this.state.timeRemaining
    });

    this.updateState();
  }

  // Check if answer is correct
  private checkAnswer(answer: Answer): boolean {
    if (!this.state) return false;

    const question = this.state.questions[this.state.currentQuestionIndex];
    
    switch (question.qtype) {
      case 'mcq':
      case 'image_mcq':
        return (answer as any).selected === question.answer_key.correct;
      
      case 'matching':
        if (!(answer as any).pairs || !question.answer_key.map) return false;
        return Object.entries((answer as any).pairs).every(([left, right]) => 
          question.answer_key.map![left] === right
        );
      
      case 'reorder':
        if (!(answer as any).order || !question.answer_key.order) return false;
        return JSON.stringify((answer as any).order) === JSON.stringify(question.answer_key.order);
      
      case 'short':
        if (!(answer as any).text || !question.answer_key.regex) return false;
        const regex = new RegExp(question.answer_key.regex, 'i');
        return regex.test((answer as any).text);
      
      default:
        return false;
    }
  }

  // Use hint
  useHint(type: 'hint' | 'example'): void {
    if (!this.state || this.state.mode === 'no_support') return;

    const questionIndex = this.state.currentQuestionIndex;
    
    // Check if we can use more hints
    if (this.state.hintsUsed[questionIndex] >= 3) return;

    // Increment hint count
    this.state.hintsUsed[questionIndex]++;

    // Log hint usage
    this.logEvent(type === 'hint' ? EVENT_TYPES.HINT_OPEN : EVENT_TYPES.EXAMPLE_OPEN, {
      questionIndex,
      hintNumber: this.state.hintsUsed[questionIndex],
      type
    });

    this.updateState();
  }

  // Request extra time
  requestExtraTime(): void {
    if (!this.state) return;

    const questionIndex = this.state.currentQuestionIndex;
    
    // Check if extra time already used
    if (this.state.extraTimeUsed[questionIndex]) return;

    // Calculate extra time to add
    const extraTimeToAdd = Math.floor(this.state.originalTimeLimit * EXTRA_TIME_FACTOR);
    
    // Apply penalty
    this.state.totalPenalties += PENALTY_EXTRA_TIME_TOTAL;
    this.state.extraTimeUsed[questionIndex] = true;

    // Extend timer
    timerController.extend();
    
    // Update extended time limit and show feedback
    this.state.extendedTimeLimit = this.state.originalTimeLimit + extraTimeToAdd;
    this.state.extraTimeAdded = extraTimeToAdd;
    this.state.showExtraTimeFeedback = true;

    // Close modal
    this.state.showTimeUpModal = false;

    // Log extra time request
    this.logEvent(EVENT_TYPES.CHOOSE_EXTRA_TIME, {
      questionIndex,
      penalty: PENALTY_EXTRA_TIME_TOTAL,
      extraTimeAdded: extraTimeToAdd
    });

    this.updateState();
    
    // Hide feedback after 3 seconds
    setTimeout(() => {
      if (this.state) {
        this.state.showExtraTimeFeedback = false;
        this.updateState();
      }
    }, 3000);
  }

  // Request skip confirmation
  requestSkipConfirmation(): void {
    if (!this.state) return;

    this.state.showSkipConfirmation = true;
    this.state.isPaused = true;
    this.updateState();
  }

  // Cancel skip confirmation
  cancelSkipConfirmation(): void {
    if (!this.state) return;

    this.state.showSkipConfirmation = false;
    this.state.isPaused = false;
    this.updateState();
  }

  // Skip question (called after confirmation)
  skipQuestion(): void {
    if (!this.state) return;

    const questionIndex = this.state.currentQuestionIndex;
    
    // Award 0 points
    this.state.scores[questionIndex] = 0;

    // Close modals
    this.state.showTimeUpModal = false;
    this.state.showSkipConfirmation = false;

    // Log skip
    this.logEvent(EVENT_TYPES.CHOOSE_SKIP, {
      questionIndex
    });

    // Move to next question or end session
    this.nextQuestion();
  }

  // Dismiss stressor banner
  dismissStressor(): void {
    if (!this.state) return;

    this.state.showStressor = false;

    this.logEvent(EVENT_TYPES.STRESSOR_DISMISS, {
      questionIndex: this.state.currentQuestionIndex,
      message: this.state.stressorMessage
    });

    this.updateState();
  }

  // Move to next question
  nextQuestion(): void {
    if (!this.state) return;

    const questionIndex = this.state.currentQuestionIndex;
    
    // Log next click
    this.logEvent(EVENT_TYPES.NEXT_CLICK, {
      questionIndex
    });

    // Check if this is the last question
    if (questionIndex >= this.state.questions.length - 1) {
      this.endSession();
      return;
    }

    // Move to next question
    this.state.currentQuestionIndex++;
    this.startQuestion();
  }

  // End session
  endSession(): SessionResult {
    if (!this.state) {
      throw new Error('Session not initialized');
    }

    // Log session end
    this.logEvent(EVENT_TYPES.SESSION_END, {
      sessionId: this.state.sessionId,
      totalScore: this.state.totalScore,
      totalPenalties: this.state.totalPenalties
    });

    // Calculate final score
    const finalScore = Math.max(0, this.state.totalScore - this.state.totalPenalties);
    const percentage = (finalScore / 100) * 100;

    const result: SessionResult = {
      sessionId: this.state.sessionId,
      totalScore: finalScore,
      percentage,
      questionsAnswered: this.state.questions.length,
      questionsSkipped: this.state.scores.filter(s => s === 0).length,
      hintsUsed: this.state.hintsUsed.reduce((sum, h) => sum + h, 0),
      extraTimeRequests: this.state.extraTimeUsed.filter(e => e).length,
      events: [...this.state.events]
    };

    this.state.isCompleted = true;
    this.updateState();

    return result;
  }

  // Select questions for session (mock implementation)
  private selectQuestions(subtopicId: string): Question[] {
    // For now, return the first 10 mock questions
    // In a real implementation, this would query the database
    return MOCK_QUESTIONS.slice(0, 10);
  }

  // Log event
  private logEvent(type: string, payload: any): void {
    if (!this.state) return;

    const event = {
      id: `${this.state.sessionId}-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      type,
      questionIndex: this.state.currentQuestionIndex,
      payload
    };

    this.state.events.push(event);
    eventLogger.logEvent(event.type, event.payload, event.questionIndex);
  }

  // Update state and notify callback
  private updateState(): void {
    if (!this.state || !this.stateUpdateCallback) return;
    this.stateUpdateCallback(this.getState());
  }

  // Cleanup
  cleanup(): void {
    if (this.stressorTimeout) {
      clearTimeout(this.stressorTimeout);
      this.stressorTimeout = null;
    }
    
    // Force stop timer before cleanup
    timerController.forceStop();
    timerController.cleanup();
    this.state = null;
    this.stateUpdateCallback = null;
  }
}

// Create a singleton instance
export const sessionEngine = new SessionEngine();

// Export the class for testing
export { SessionEngine };
