// Post-answer reveal system for CLES sessions
// Handles showing correct answers, explanations, and encouragement

import { Question, Answer, getCorrectAnswer } from './questionTypes';
import { ENCOURAGEMENT_MESSAGES } from './constants';
import { eventLogger } from './eventLogger';

export interface RevealState {
  showReveal: boolean;
  question: Question | null;
  userAnswer: Answer | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  encouragement: string;
  pointsAwarded: number;
  hintsUsed: number;
  timeSpent: number;
  dwellTime: number;
  startTime: number;
}

export interface RevealResult {
  isCorrect: boolean;
  pointsAwarded: number;
  encouragement: string;
  explanation: string;
  correctAnswer: string;
  dwellTime: number;
}

class PostAnswerRevealManager {
  private state: RevealState = {
    showReveal: false,
    question: null,
    userAnswer: null,
    correctAnswer: '',
    isCorrect: false,
    explanation: '',
    encouragement: '',
    pointsAwarded: 0,
    hintsUsed: 0,
    timeSpent: 0,
    dwellTime: 0,
    startTime: 0
  };

  // Show answer reveal
  showReveal(
    question: Question,
    userAnswer: Answer,
    isCorrect: boolean,
    pointsAwarded: number,
    hintsUsed: number,
    timeSpent: number
  ): RevealState {
    const correctAnswer = getCorrectAnswer(question);
    const explanation = this.generateExplanation(question, isCorrect);
    const encouragement = this.generateEncouragement(isCorrect);

    this.state = {
      showReveal: true,
      question,
      userAnswer,
      correctAnswer,
      isCorrect,
      explanation,
      encouragement,
      pointsAwarded,
      hintsUsed,
      timeSpent,
      dwellTime: 0,
      startTime: Date.now()
    };

    return this.getState();
  }

  // Generate explanation based on question type and correctness
  private generateExplanation(question: Question, isCorrect: boolean): string {
    if (isCorrect) {
      return this.getCorrectExplanation(question);
    } else {
      return this.getIncorrectExplanation(question);
    }
  }

  // Get explanation for correct answer
  private getCorrectExplanation(question: Question): string {
    switch (question.qtype) {
      case 'mcq':
      case 'image_mcq':
        return `Correct! ${question.hint || 'Well done!'}`;
      
      case 'matching':
        return `Perfect! You correctly matched all the pairs. ${question.hint || 'Great job!'}`;
      
      case 'reorder':
        return `Excellent! You got the correct sequence. ${question.hint || 'Well done!'}`;
      
      case 'short':
        return `Correct! ${question.hint || 'Great answer!'}`;
      
      default:
        return 'Well done!';
    }
  }

  // Get explanation for incorrect answer
  private getIncorrectExplanation(question: Question): string {
    switch (question.qtype) {
      case 'mcq':
      case 'image_mcq':
        return `Not quite. ${question.hint || 'Review the concept and try the next one.'}`;
      
      case 'matching':
        return `Some matches were incorrect. ${question.hint || 'Review the relationships between these concepts.'}`;
      
      case 'reorder':
        return `The sequence wasn't quite right. ${question.hint || 'Think about the logical order of these steps.'}`;
      
      case 'short':
        return `Not the expected answer. ${question.hint || 'Review the definition and try the next one.'}`;
      
      default:
        return 'Not quite right. Review the concept and try the next one.';
    }
  }

  // Generate encouragement message
  private generateEncouragement(isCorrect: boolean): string {
    const messages = isCorrect 
      ? ENCOURAGEMENT_MESSAGES.correct 
      : ENCOURAGEMENT_MESSAGES.incorrect;
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Get current state
  getState(): RevealState {
    return { ...this.state };
  }

  // Check if reveal is showing
  isShowing(): boolean {
    return this.state.showReveal;
  }

  // Get dwell time (time spent viewing reveal)
  getDwellTime(): number {
    if (!this.state.showReveal) return 0;
    return Date.now() - this.state.startTime;
  }

  // Hide reveal
  hideReveal(): void {
    this.state.showReveal = false;
    this.state.dwellTime = this.getDwellTime();
  }

  // Get reveal result
  getRevealResult(): RevealResult {
    return {
      isCorrect: this.state.isCorrect,
      pointsAwarded: this.state.pointsAwarded,
      encouragement: this.state.encouragement,
      explanation: this.state.explanation,
      correctAnswer: this.state.correctAnswer,
      dwellTime: this.state.dwellTime
    };
  }

  // Reset state
  reset(): void {
    this.state = {
      showReveal: false,
      question: null,
      userAnswer: null,
      correctAnswer: '',
      isCorrect: false,
      explanation: '',
      encouragement: '',
      pointsAwarded: 0,
      hintsUsed: 0,
      timeSpent: 0,
      dwellTime: 0,
      startTime: 0
    };
  }

  // Get detailed feedback for the question
  getDetailedFeedback(): {
    question: Question | null;
    userAnswer: Answer | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
    encouragement: string;
    pointsAwarded: number;
    hintsUsed: number;
    timeSpent: number;
    dwellTime: number;
  } {
    return {
      question: this.state.question,
      userAnswer: this.state.userAnswer,
      correctAnswer: this.state.correctAnswer,
      isCorrect: this.state.isCorrect,
      explanation: this.state.explanation,
      encouragement: this.state.encouragement,
      pointsAwarded: this.state.pointsAwarded,
      hintsUsed: this.state.hintsUsed,
      timeSpent: this.state.timeSpent,
      dwellTime: this.state.dwellTime
    };
  }
}

// Create a singleton instance
export const postAnswerRevealManager = new PostAnswerRevealManager();

// Export the class for testing
export { PostAnswerRevealManager };




