// Support nudges system for CLES sessions
// Provides adaptive suggestions based on user behavior and cognitive load

import { liveStreamsManager } from './liveStreams';
import { eventLogger } from './eventLogger';
import { REST_MIN_MS, REST_MAX_MS } from './constants';

export interface NudgeSuggestion {
  type: 'rest' | 'hint' | 'example' | 'encouragement' | 'extra_time';
  message: string;
  action?: () => void;
  dismissible: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface NudgeState {
  suggestions: NudgeSuggestion[];
  restActive: boolean;
  restStartTime: number | null;
  hintsOffered: number;
  encouragementsShown: number;
  lastAttentionCheck: number;
  consecutiveLowAttention: number;
}

class SupportNudgesManager {
  private state: NudgeState = {
    suggestions: [],
    restActive: false,
    restStartTime: null,
    hintsOffered: 0,
    encouragementsShown: 0,
    lastAttentionCheck: 0,
    consecutiveLowAttention: 0
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private currentQuestionIndex = 0;

  // Initialize nudges for a question
  initialize(questionIndex: number): void {
    this.currentQuestionIndex = questionIndex;
    this.state = {
      suggestions: [],
      restActive: false,
      restStartTime: null,
      hintsOffered: 0,
      encouragementsShown: 0,
      lastAttentionCheck: Date.now(),
      consecutiveLowAttention: 0
    };

    this.startMonitoring();
  }

  // Start monitoring user behavior
  private startMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkForNudges();
    }, 3000); // Check every 3 seconds

    this.isActive = true;
  }

  // Check for nudges based on current state
  private checkForNudges(): void {
    if (!this.isActive) return;

    const now = Date.now();
    const timeSinceLastCheck = now - this.state.lastAttentionCheck;
    
    if (timeSinceLastCheck < 3000) return; // Don't check too frequently

    this.state.lastAttentionCheck = now;

    // Check attention levels
    const averageAttention = liveStreamsManager.getAverageAttention(10);
    const faceDetected = liveStreamsManager.isFaceDetected();
    const needsRest = liveStreamsManager.needsRest();
    const isStruggling = liveStreamsManager.isStruggling();

    // Track consecutive low attention
    if (averageAttention < 0.3 || !faceDetected) {
      this.state.consecutiveLowAttention++;
    } else {
      this.state.consecutiveLowAttention = 0;
    }

    // Suggest rest if needed
    if (needsRest && this.state.consecutiveLowAttention >= 3 && !this.state.restActive) {
      this.suggestRest();
    }

    // Offer hints if struggling
    if (isStruggling && this.state.hintsOffered < 2) {
      this.offerHint();
    }

    // Show encouragement periodically
    if (averageAttention > 0.7 && this.state.encouragementsShown < 1) {
      this.showEncouragement();
    }
  }

  // Suggest rest break
  private suggestRest(): void {
    const restDuration = Math.floor(Math.random() * (REST_MAX_MS - REST_MIN_MS)) + REST_MIN_MS;
    
    const suggestion: NudgeSuggestion = {
      type: 'rest',
      message: `You seem to need a break. Take a ${Math.floor(restDuration / 60000)}-minute rest to recharge.`,
      action: () => this.startRest(restDuration),
      dismissible: true,
      priority: 'high'
    };

    this.addSuggestion(suggestion);
    eventLogger.logRestSuggest(this.currentQuestionIndex, 'Low attention detected');
  }

  // Offer hint
  private offerHint(): void {
    const hintTypes = ['hint', 'example'];
    const hintType = hintTypes[Math.floor(Math.random() * hintTypes.length)] as 'hint' | 'example';
    
    const suggestion: NudgeSuggestion = {
      type: hintType,
      message: hintType === 'hint' 
        ? "Need a hint to get unstuck?" 
        : "Would you like to see an example?",
      action: () => this.useHint(hintType),
      dismissible: true,
      priority: 'medium'
    };

    this.addSuggestion(suggestion);
    this.state.hintsOffered++;
    eventLogger.logHintOffer(this.currentQuestionIndex, hintType);
  }

  // Show encouragement
  private showEncouragement(): void {
    const encouragements = [
      "Great focus! You're doing well.",
      "Keep up the good work!",
      "You're making excellent progress.",
      "Stay focused, you've got this!"
    ];

    const message = encouragements[Math.floor(Math.random() * encouragements.length)];
    
    const suggestion: NudgeSuggestion = {
      type: 'encouragement',
      message,
      dismissible: true,
      priority: 'low'
    };

    this.addSuggestion(suggestion);
    this.state.encouragementsShown++;
  }

  // Start rest break
  private startRest(duration: number): void {
    this.state.restActive = true;
    this.state.restStartTime = Date.now();
    
    // Remove rest suggestion
    this.removeSuggestion('rest');
    
    // Add resume suggestion
    const suggestion: NudgeSuggestion = {
      type: 'rest',
      message: `Rest break active. Click to resume when ready.`,
      action: () => this.resumeRest(),
      dismissible: false,
      priority: 'high'
    };

    this.addSuggestion(suggestion);
    eventLogger.logRestStart(this.currentQuestionIndex, duration);
  }

  // Resume from rest
  private resumeRest(): void {
    const restDuration = this.state.restStartTime 
      ? Date.now() - this.state.restStartTime 
      : 0;

    this.state.restActive = false;
    this.state.restStartTime = null;
    this.state.consecutiveLowAttention = 0;
    
    this.removeSuggestion('rest');
    eventLogger.logRestResume(this.currentQuestionIndex, restDuration);
  }

  // Use hint
  private useHint(type: 'hint' | 'example'): void {
    this.removeSuggestion(type);
    
    if (type === 'hint') {
      eventLogger.logHintOpen(this.currentQuestionIndex, 'hint');
    } else {
      eventLogger.logExampleOpen(this.currentQuestionIndex);
    }
  }

  // Add suggestion
  private addSuggestion(suggestion: NudgeSuggestion): void {
    // Remove existing suggestions of the same type
    this.removeSuggestion(suggestion.type);
    
    this.state.suggestions.push(suggestion);
  }

  // Remove suggestion
  private removeSuggestion(type: string): void {
    this.state.suggestions = this.state.suggestions.filter(s => s.type !== type);
  }

  // Dismiss suggestion
  dismissSuggestion(type: string): void {
    this.removeSuggestion(type);
  }

  // Get current suggestions
  getSuggestions(): NudgeSuggestion[] {
    return [...this.state.suggestions];
  }

  // Check if rest is active
  isRestActive(): boolean {
    return this.state.restActive;
  }

  // Get rest duration
  getRestDuration(): number {
    if (!this.state.restActive || !this.state.restStartTime) return 0;
    return Date.now() - this.state.restStartTime;
  }

  // Cleanup
  cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isActive = false;
    this.state = {
      suggestions: [],
      restActive: false,
      restStartTime: null,
      hintsOffered: 0,
      encouragementsShown: 0,
      lastAttentionCheck: 0,
      consecutiveLowAttention: 0
    };
  }

  // Get nudge statistics
  getStats(): {
    hintsOffered: number;
    encouragementsShown: number;
    restBreaksTaken: number;
    totalSuggestions: number;
  } {
    return {
      hintsOffered: this.state.hintsOffered,
      encouragementsShown: this.state.encouragementsShown,
      restBreaksTaken: this.state.restStartTime ? 1 : 0,
      totalSuggestions: this.state.suggestions.length
    };
  }
}

// Create a singleton instance
export const supportNudgesManager = new SupportNudgesManager();

// Export the class for testing
export { SupportNudgesManager };


