// Session engine for CLES sessions
// Implements the complete flow according to the specification

import { SCHEDULE, PENALTY_HINT_PER_USE, PENALTY_EXTRA_TIME_TOTAL, EXTRA_TIME_FACTOR } from './config';
import { Question, Answer } from './questionTypes';
import { timerController } from './TimerController';
import { liveStreamsManager } from './liveStreams';
import { HRV_CONFIG } from './hrvConfig';
import {
  calculateMentalDemand,
  calculatePhysicalDemand,
  calculateTemporalDemand,
  calculatePerformance,
  calculateEffort,
  calculateFrustration
} from './nasaTlx';

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
  exampleUsed: boolean[];
  extraTimeUsed: boolean[];
  showSupportPopup: boolean;
  supportPopupShown: boolean[];
  scores: number[];
  totalScore: number;
  totalPenalties: number;
  isCompleted: boolean;
  startedAt: string;
}

export interface SessionResult {
  sessionId: string;
  totalScore: number;
  percentage: number;
  questionsAnswered: number;
  questionsSkipped: number;
  hintsUsed: number;
  extraTimeRequests: number;
}

class SessionEngine {
  private state: SessionState | null = null;
  private stateUpdateCallback: ((state: SessionState) => void) | null = null;
  private stressorTimeout: NodeJS.Timeout | null = null;
  private attentionCaptureInterval: NodeJS.Timeout | null = null;
  private pythonBackendUrl: string = 'http://localhost:5001';

  // Initialize session with questions from database
  initialize(
    sessionId: number | string,
    userId: string,
    subtopicId: number | string,
    mode: 'support' | 'no_support',
    onStateUpdate: (state: SessionState) => void,
    questionsOverride?: Question[]
  ): SessionState {
    // Questions must be provided from database
    if (!questionsOverride || questionsOverride.length === 0) {
      throw new Error('No questions provided. Questions must be fetched from the database before initializing the session.');
    }

    const questions = questionsOverride;

    this.state = {
      sessionId: String(sessionId),
      userId,
      subtopicId: String(subtopicId),
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
      hintsUsed: new Array(5).fill(0),
      exampleUsed: new Array(5).fill(false),
      extraTimeUsed: new Array(5).fill(false),
      showSupportPopup: false,
      supportPopupShown: new Array(5).fill(false),
      scores: new Array(5).fill(0),
      totalScore: 0,
      totalPenalties: 0,
      isCompleted: false,
      startedAt: new Date().toISOString()
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
    
    // Safety check for config
    if (!config) {
      console.error(`No config found for question index ${questionIndex}`);
      return;
    }
    
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

    // Set current question for q_label tagging
    this.setCurrentQuestion(questionIndex + 1);

    // Start attention capture on first question
    if (questionIndex === 0 && !this.attentionCaptureInterval) {
      this.startAttentionCapture();
    }

    // Schedule stressor banner
    this.scheduleStressorBanner();

    this.updateState();
  }

  // Set current question for q_label tagging
  // Uses ESP32 beat timestamps as authoritative time reference
  private async setCurrentQuestion(qIndex: number): Promise<void> {
    if (!this.state) return;

    try {
      const q_label = `q${qIndex}`;
      let timestamp: number;

      if (qIndex === 1) {
        // Transitioning from calibration (q0) to Q1
        console.log(`📊 Querying last calibration beat for Q1 boundary...`);

        try {
          const response = await fetch(
            `/api/sessions/${this.state.sessionId}/get-last-beat?q_label=q0`
          );

          if (response.ok) {
            const { lastBeat } = await response.json();

            if (lastBeat && lastBeat.ts_ms) {
              // Use last calibration beat timestamp + 1ms as Q1 start
              timestamp = lastBeat.ts_ms + 1;
              console.log(`✅ Using last calibration beat: ${lastBeat.ts_ms}ms, Q1 starts at ${timestamp}ms (ESP32 time)`);
            } else {
              // Fallback: Use calibration duration constant
              timestamp = HRV_CONFIG.CALIBRATION_DURATION_MS;
              console.log(`⚠️ No calibration beats found, using constant: ${timestamp}ms`);
            }
          } else {
            // Fallback on API error
            timestamp = HRV_CONFIG.CALIBRATION_DURATION_MS;
            console.log(`⚠️ API error getting last beat, using constant: ${timestamp}ms`);
          }
        } catch (error) {
          // Fallback on fetch error
          timestamp = HRV_CONFIG.CALIBRATION_DURATION_MS;
          console.log(`⚠️ Error fetching last beat, using constant: ${timestamp}ms`, error);
        }
      } else {
        // Transitioning between questions (Q1→Q2, Q2→Q3, etc.)
        const previousLabel = `q${qIndex - 1}`;
        console.log(`📊 Querying last beat from ${previousLabel} for Q${qIndex} boundary...`);

        try {
          const response = await fetch(
            `/api/sessions/${this.state.sessionId}/get-last-beat?q_label=${previousLabel}`
          );

          if (response.ok) {
            const { lastBeat } = await response.json();

            if (lastBeat && lastBeat.ts_ms) {
              // Use last previous question beat + 1ms as new question start
              timestamp = lastBeat.ts_ms + 1;
              console.log(`✅ Using last ${previousLabel} beat: ${lastBeat.ts_ms}ms, Q${qIndex} starts at ${timestamp}ms (ESP32 time)`);
            } else {
              // Fallback: estimate based on calibration + question times
              timestamp = HRV_CONFIG.CALIBRATION_DURATION_MS + (qIndex - 1) * 20000;
              console.log(`⚠️ No beats found for ${previousLabel}, estimating: ${timestamp}ms`);
            }
          } else {
            // Fallback on API error
            timestamp = HRV_CONFIG.CALIBRATION_DURATION_MS + (qIndex - 1) * 20000;
            console.log(`⚠️ API error getting last beat, estimating: ${timestamp}ms`);
          }
        } catch (error) {
          // Fallback on fetch error
          timestamp = HRV_CONFIG.CALIBRATION_DURATION_MS + (qIndex - 1) * 20000;
          console.log(`⚠️ Error fetching last beat, estimating: ${timestamp}ms`, error);
        }
      }

      console.log(`📝 Setting session ${this.state.sessionId} to ${q_label} at timestamp ${timestamp}ms (ESP32 clock)`);

      // Call set-question API with calculated timestamp
      const response = await fetch(`/api/sessions/${this.state.sessionId}/set-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q_label, timestamp })
      });

      if (response.ok) {
        console.log(`✅ Session question set to ${q_label} at ${timestamp}ms (ESP32 clock)`);
      } else {
        console.error(`❌ Failed to set question (${response.status})`);
      }
    } catch (error) {
      console.error('❌ Error setting current question:', error);
    }
  }

  // Calculate HRV for a question
  private async calculateQuestionHRV(qIndex: number): Promise<void> {
    if (!this.state) return;

    try {
      console.log(`📊 Calculating HRV for Q${qIndex}...`);

      const response = await fetch(`/api/sessions/${this.state.sessionId}/calculate-question-hrv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qIndex })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ HRV calculated for Q${qIndex}:`, data.hrvMetrics);

        if (data.warning) {
          console.warn(`⚠️ HRV warning for Q${qIndex}:`, data.warning);
        }
      } else {
        const error = await response.json();
        console.warn(`Failed to calculate HRV for Q${qIndex}:`, error.error || response.statusText);
      }
    } catch (error) {
      console.warn('Error calculating question HRV:', error);
    }
  }

  // Start capturing attention status every 5 seconds
  private startAttentionCapture(): void {
    if (!this.state) return;

    console.log('✅ Starting attention capture for session:', this.state.sessionId);

    this.attentionCaptureInterval = setInterval(async () => {
      if (!this.state || this.state.isCompleted) {
        console.log('⏸️ Session completed, stopping attention capture');
        this.stopAttentionCapture();
        return;
      }

      try {
        const qLabel = `q${this.state.currentQuestionIndex + 1}`;

        // Fetch attention status from Python backend
        const response = await fetch(`${this.pythonBackendUrl}/status`);
        if (!response.ok) {
          console.error('❌ Python backend returned error:', response.status);
          return;
        }

        const data = await response.json();

        // Check state again after async operation
        if (!this.state || this.state.isCompleted) {
          console.log('⏸️ Session state changed during fetch, skipping capture');
          return;
        }

        // Insert to database via API
        const captureResponse = await fetch('/api/attention/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.state.sessionId,
            attention_status: data.status,
            q_label: qLabel
          })
        });

        if (!captureResponse.ok) {
          const errorData = await captureResponse.json();
          console.error('❌ Failed to capture attention:', errorData);
          return;
        }

        console.log(`📸 Captured attention: ${data.status} for ${qLabel}`);
      } catch (error) {
        console.error('❌ Failed to capture attention:', error);
      }
    }, 5000); // Every 5 seconds
  }

  // Stop attention capture interval
  private stopAttentionCapture(): void {
    if (this.attentionCaptureInterval) {
      clearInterval(this.attentionCaptureInterval);
      this.attentionCaptureInterval = null;
      console.log('🛑 Stopped attention capture');
    }
  }

  // Calculate attention rate for a question
  private async calculateQuestionAttentionRate(qIndex: number): Promise<void> {
    if (!this.state) return;

    try {
      const qLabel = `q${qIndex}`;
      console.log(`📊 Calculating attention rate for ${qLabel}...`);

      const response = await fetch(
        `/api/attention/question-rate?session_id=${this.state.sessionId}&q_label=${qLabel}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Attention rate for ${qLabel}: ${data.attention_rate}% (${data.focused_count}/${data.total_count})`);
      } else {
        const error = await response.json();
        console.warn(`Failed to calculate attention rate for ${qLabel}:`, error.error || response.statusText);
      }
    } catch (error) {
      console.warn('Error calculating question attention rate:', error);
    }
  }

  // Calculate and save NASA-TLX dimensions for a question
  private async calculateAndSaveNasaTLX(
    questionIndex: number,      // 0-4 (internal index)
    pointsAwarded: number,       // Already calculated
    isCorrect: boolean,          // Already determined
    timeMs: number,              // Already calculated
    hintsUsed: number,           // From state
    examplePenalty: number,      // Already calculated (0 or 0.01)
    extraTimeUsed: boolean       // From state
  ): Promise<void> {
    if (!this.state) {
      console.error('❌ No session state available for NASA-TLX calculation');
      return;
    }

    const qIndex = questionIndex + 1; // Convert to 1-5
    const sessionId = Number(this.state.sessionId);
    const question = this.state.questions[questionIndex];

    try {
      console.log(`📊 Calculating NASA-TLX dimensions for Q${qIndex}...`);

      // Step 1: Fetch required data from database
      const { DatabaseClient } = await import('./database');

      // Fetch session data
      const session = await DatabaseClient.getSession(this.state.sessionId);
      if (!session) {
        console.error('❌ Session not found for NASA-TLX calculation');
        return;
      }

      // Fetch user profile data
      const user = await DatabaseClient.getUser(session.user_id);
      if (!user) {
        console.error('❌ User not found for NASA-TLX calculation');
        return;
      }

      // Fetch response record (contains attention_rate, rmssd_q, rmssd_base)
      const response = await DatabaseClient.getResponseBySessionAndIndex(sessionId, qIndex);
      if (!response) {
        console.error('❌ Response not found for NASA-TLX calculation');
        return;
      }

      // Fetch subtopic to get the key for familiarity lookup
      const subtopic = await DatabaseClient.getSubtopicById(session.subtopic_id);
      const subtopicKey = subtopic?.key || 'unknown';

      // Step 2: Extract data with defaults
      // Mental Demand inputs
      // Convert numeric difficulty (1, 3, 5) back to letter format ('E', 'M', 'H') for NASA-TLX
      const difficultyNumeric = question.difficulty as number;
      let difficulty: 'E' | 'M' | 'H';
      if (difficultyNumeric === 1) {
        difficulty = 'E';
      } else if (difficultyNumeric === 5) {
        difficulty = 'H';
      } else {
        difficulty = 'M'; // Default to Medium for 3 or any other value
      }

      const familiarity = user.profile_prior_knowledge?.[subtopicKey] || 'none';
      const mathGrade = user.profile_math_grade || 'not_taken';
      const programmingGrade = user.profile_programming_grade || 'not_taken';
      const courseTaken = user.profile_experience_taken_course || 'not_sure';
      const practiceLevel = user.profile_experience_hands_on || 'none';

      // Physical Demand input
      const environmentNoise = session.environment_noise || 10; // Default to neutral

      // Effort inputs
      const attentionRate = response.attention_rate || null; // Can be null, defaults to 50 in function

      // Frustration inputs
      const baselineRMSSD = response.metrics?.rmssd_base || session.rmssd_baseline || null;
      const questionRMSSD = response.metrics?.rmssd_q || null;

      // Step 3: Calculate all 6 dimensions
      // 1. Mental Demand
      const mentalDemand = calculateMentalDemand(
        difficulty,
        familiarity,
        mathGrade,
        programmingGrade,
        courseTaken,
        practiceLevel
      );

      // 2. Physical Demand
      const physicalDemand = calculatePhysicalDemand(environmentNoise);

      // 3. Temporal Demand
      const temporalDemand = calculateTemporalDemand(timeMs, qIndex, extraTimeUsed);

      // 4. Performance
      const performance = calculatePerformance(qIndex, pointsAwarded);

      // 5. Effort
      const effort = calculateEffort(
        timeMs,
        qIndex,
        extraTimeUsed,
        hintsUsed,
        examplePenalty,
        attentionRate
      );

      // 6. Frustration
      let frustration = 10.5; // Default to neutral
      if (baselineRMSSD && questionRMSSD) {
        frustration = calculateFrustration(baselineRMSSD, questionRMSSD);
      } else {
        console.warn(`⚠️ Missing RMSSD data for Q${qIndex}, using neutral frustration (10.5)`);
      }

      // Step 4: Calculate Cognitive Load (average of 6 dimensions)
      const cognitiveLoad = (
        mentalDemand +
        physicalDemand +
        temporalDemand +
        performance +
        effort +
        frustration
      ) / 6;

      console.log(`✅ NASA-TLX calculated for Q${qIndex}:`, {
        mentalDemand: mentalDemand.toFixed(2),
        physicalDemand: physicalDemand.toFixed(2),
        temporalDemand: temporalDemand.toFixed(2),
        performance: performance.toFixed(2),
        effort: effort.toFixed(2),
        frustration: frustration.toFixed(2),
        cognitiveLoad: cognitiveLoad.toFixed(2)
      });

      // Step 5: Save to database
      await DatabaseClient.createNasaTlxSystem({
        session_id: sessionId,
        question_id: Number(question.id),
        q_index: qIndex,
        mental_demand: mentalDemand,
        physical_demand: physicalDemand,
        temporal_demand: temporalDemand,
        performance: performance,
        effort: effort,
        frustration: frustration,
        cognitive_load: cognitiveLoad
      });

      console.log(`💾 NASA-TLX data saved for Q${qIndex}`);
    } catch (error) {
      console.error(`❌ Failed to calculate/save NASA-TLX data for Q${qIndex}:`, error);
      // Don't throw - allow session to continue even if NASA-TLX calculation fails
    }
  }

  // Calculate overall session attention rate
  private async calculateSessionAttentionRate(): Promise<void> {
    if (!this.state) return;

    try {
      console.log('📊 Calculating overall session attention rate...');

      const response = await fetch(
        `/api/attention/session-rate?session_id=${this.state.sessionId}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Overall session attention rate: ${data.attention_rate}% (${data.focused_count}/${data.total_count})`);
      } else {
        const error = await response.json();
        console.warn('Failed to calculate session attention rate:', error.error || response.statusText);
      }
    } catch (error) {
      console.warn('Error calculating session attention rate:', error);
    }
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

    // Check for support popup trigger at 20 seconds
    this.checkSupportPopupTrigger();

    this.updateState();
  }

  // Handle 10-second warning
  private handleTenSecondWarning(secondsLeft: number): void {
    if (!this.state) return;

    this.updateState();
  }

  // Check if we should show support popup at 20 seconds
  private checkSupportPopupTrigger(): void {
    if (!this.state) return;

    const {
      mode,
      timeRemaining,
      currentQuestionIndex,
      hintsUsed,
      exampleUsed,
      supportPopupShown,
      showSupportPopup,
      showReveal
    } = this.state;

    // Only for support mode
    if (mode !== 'support') return;

    // Only for Q4 and Q5 (indices 3 and 4)
    if (currentQuestionIndex !== 3 && currentQuestionIndex !== 4) return;

    // Only at exactly 20 seconds remaining
    if (timeRemaining !== 20) return;

    // Don't show if already shown for this question
    if (supportPopupShown[currentQuestionIndex]) return;

    // Don't show if popup is already visible
    if (showSupportPopup) return;

    // Don't show if answer is revealed
    if (showReveal) return;

    // Check conditions: example NOT used AND hints < 2
    const exampleNotUsed = !exampleUsed[currentQuestionIndex];
    const hintsLessThan2 = hintsUsed[currentQuestionIndex] < 2;

    // If all conditions met, show popup
    if (exampleNotUsed && hintsLessThan2) {
      this.state.showSupportPopup = true;
      this.state.supportPopupShown[currentQuestionIndex] = true;
      // Note: updateState() will be called in handleTimerEvent
    }
  }

  // Dismiss support popup (user clicked "No")
  public dismissSupportPopup(): void {
    if (!this.state) return;
    this.state.showSupportPopup = false;
    this.updateState();
  }

  // Accept support offer (user clicked "Yes")
  public acceptSupportOffer(): void {
    if (!this.state) return;
    this.state.showSupportPopup = false;
    this.updateState();
    // The actual example expansion will be triggered in page.tsx
  }

  // Handle timeout
  private handleTimeout(): void {
    if (!this.state) return;

    this.state.showTimeUpModal = true;
    this.state.isPaused = true;

    this.updateState();
  }

  // Submit answer
  async submitAnswer(answer: Answer): Promise<void> {
    if (!this.state || this.state.showReveal) return;

    // Pause timer
    timerController.pause();

    // Check if answer is correct
    const isCorrect = this.checkAnswer(answer);
    const questionIndex = this.state.currentQuestionIndex;
    const config = SCHEDULE[questionIndex];
    
    // Calculate points awarded
    const hintPenalty = this.state.hintsUsed[questionIndex] * PENALTY_HINT_PER_USE;
    const examplePenalty = this.state.exampleUsed[questionIndex] ? PENALTY_HINT_PER_USE : 0;
    const extraTimePenalty = this.state.extraTimeUsed[questionIndex] ? PENALTY_EXTRA_TIME_TOTAL : 0;
    const totalPenalty = hintPenalty + examplePenalty + extraTimePenalty;
    const pointsAwarded = isCorrect ? Math.max(0, config.points - totalPenalty) : 0;
    
    this.state.scores[questionIndex] = pointsAwarded;
    this.state.totalScore += pointsAwarded;

    // Persist response to database
    try {
      const { DatabaseClient } = await import('./database');
      await DatabaseClient.createResponse({
        session_id: this.state.sessionId,
        question_id: String(this.state.questions[questionIndex].id),
        q_index: questionIndex + 1,
        user_answer: answer,
        correct: isCorrect,
        time_ms: (config.limit - this.state.timeRemaining) * 1000,
        hints_used: this.state.hintsUsed[questionIndex],
        extra_time_used: this.state.extraTimeUsed[questionIndex],
        metrics: {
          hintPenalty,
          examplePenalty,
          extraTimePenalty,
          totalPenalty,
          pointsAwarded
        }
      });
    } catch (error) {
      console.error('Failed to persist response:', error);
    }

    // Show reveal
    this.state.showReveal = true;
    this.state.isPaused = true;

    // Calculate HRV for this question
    await this.calculateQuestionHRV(questionIndex + 1);

    // Calculate attention rate for this question
    await this.calculateQuestionAttentionRate(questionIndex + 1);

    // Calculate and save NASA-TLX dimensions
    await this.calculateAndSaveNasaTLX(
      questionIndex,
      pointsAwarded,
      isCorrect,
      (config.limit - this.state.timeRemaining) * 1000,
      this.state.hintsUsed[questionIndex],
      examplePenalty,
      this.state.extraTimeUsed[questionIndex]
    );

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
    
    if (type === 'hint') {
      // Check if we can use more hints
      if (this.state.hintsUsed[questionIndex] >= 3) return;
      // Increment hint count
      this.state.hintsUsed[questionIndex]++;
    } else {
      // Example: does not count toward 3 hints, but only charge once
      if (this.state.exampleUsed[questionIndex]) return;
      this.state.exampleUsed[questionIndex] = true;
    }

    // Apply penalty for hint or example (already deducted from pointsAwarded, so don't double-count)
    // this.state.totalPenalties += PENALTY_HINT_PER_USE;

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
  async skipQuestion(): Promise<void> {
    if (!this.state) return;

    const questionIndex = this.state.currentQuestionIndex;
    const config = SCHEDULE[questionIndex];
    
    // Award 0 points
    this.state.scores[questionIndex] = 0;

    // Persist skipped response to database
    try {
      const { DatabaseClient } = await import('./database');
      await DatabaseClient.createResponse({
        session_id: this.state.sessionId,
        question_id: String(this.state.questions[questionIndex].id),
        q_index: questionIndex + 1,
        user_answer: null, // Skipped question has no answer
        correct: false, // Skipped questions are considered incorrect
        time_ms: (config.limit - this.state.timeRemaining) * 1000,
        hints_used: this.state.hintsUsed[questionIndex],
        extra_time_used: this.state.extraTimeUsed[questionIndex],
        metrics: {
          skipped: true,
          hintPenalty: this.state.hintsUsed[questionIndex] * PENALTY_HINT_PER_USE,
          examplePenalty: this.state.exampleUsed[questionIndex] ? PENALTY_HINT_PER_USE : 0,
          extraTimePenalty: this.state.extraTimeUsed[questionIndex] ? PENALTY_EXTRA_TIME_TOTAL : 0,
          pointsAwarded: 0
        }
      });
    } catch (error) {
      console.error('Failed to persist skipped response:', error);
    }

    // Close modals
    this.state.showTimeUpModal = false;
    this.state.showSkipConfirmation = false;

    // Calculate HRV for this question (even if skipped - valuable stress data)
    await this.calculateQuestionHRV(questionIndex + 1);

    // Calculate attention rate for this question (even if skipped)
    await this.calculateQuestionAttentionRate(questionIndex + 1);

    // Calculate and save NASA-TLX dimensions (even for skipped questions)
    await this.calculateAndSaveNasaTLX(
      questionIndex,
      0,
      false,
      (config.limit - this.state.timeRemaining) * 1000,
      this.state.hintsUsed[questionIndex],
      this.state.exampleUsed[questionIndex] ? PENALTY_HINT_PER_USE : 0,
      this.state.extraTimeUsed[questionIndex]
    );

    // Move to next question or end session
    this.nextQuestion();
  }

  // Dismiss stressor banner
  dismissStressor(): void {
    if (!this.state) return;

    this.state.showStressor = false;

    this.updateState();
  }

  // Move to next question
  nextQuestion(): void {
    if (!this.state) return;

    const questionIndex = this.state.currentQuestionIndex;

    // Check if this is the last question
    if (questionIndex >= this.state.questions.length - 1) {
      this.endSession();
      return;
    }
    
    // Additional safety check for config availability
    const nextQuestionIndex = questionIndex + 1;
    if (nextQuestionIndex >= SCHEDULE.length) {
      this.endSession();
      return;
    }

    // Move to next question
    this.state.currentQuestionIndex++;
    this.startQuestion();
  }

  // End session
  async endSession(): Promise<SessionResult> {
    if (!this.state) {
      throw new Error('Session not initialized');
    }

    // Calculate final score
    const finalScore = Math.max(0, Number((this.state.totalScore - this.state.totalPenalties).toFixed(1)));
    const percentage = (finalScore / 10) * 100;

    // Update session score in database
    try {
      const { DatabaseClient } = await import('./database');
      await DatabaseClient.updateSessionScore(parseInt(this.state.sessionId), finalScore);
    } catch (error) {
      console.error('Failed to update session score:', error);
    }

    // Stop attention capture
    this.stopAttentionCapture();

    // Calculate overall session attention rate
    await this.calculateSessionAttentionRate();

    const result: SessionResult = {
      sessionId: this.state.sessionId,
      totalScore: finalScore,
      percentage,
      questionsAnswered: this.state.questions.length,
      questionsSkipped: this.state.scores.filter(s => s === 0).length,
      hintsUsed: this.state.hintsUsed.reduce((sum, h) => sum + h, 0),
      extraTimeRequests: this.state.extraTimeUsed.filter(e => e).length
    };

    this.state.isCompleted = true;
    this.updateState();

    return result;
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

    // Stop attention capture
    this.stopAttentionCapture();

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
