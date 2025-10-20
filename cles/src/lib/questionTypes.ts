// Question types and validation system for CLES sessions

import { QUESTION_TYPES } from './constants';

// Base question interface
export interface BaseQuestion {
  id: string | number;
  subtopic_id: string | number;
  difficulty: number; // 1-5
  qtype: string;
  prompt: string;
  hint?: string;
  example?: string;
  explanation?: string;
  hints?: string[];
  enabled: boolean;
}

// MCQ question
export interface MCQQuestion extends BaseQuestion {
  qtype: 'mcq';
  options: Array<{
    key: string;
    text: string;
  }>;
  answer_key: {
    correct: string;
  };
}

// Image MCQ question
export interface ImageMCQQuestion extends BaseQuestion {
  qtype: 'image_mcq';
  media: {
    imgUrl: string;
  };
  options: Array<{
    key: string;
    text: string;
  }>;
  answer_key: {
    correct: string;
  };
}

// Matching question
export interface MatchingQuestion extends BaseQuestion {
  qtype: 'matching';
  pairs_left: string[];
  pairs_right: string[];
  answer_key: {
    map: Record<string, string>;
  };
}

// Reorder question
export interface ReorderQuestion extends BaseQuestion {
  qtype: 'reorder';
  sequence: string[];
  answer_key: {
    order: string[];
  };
}

// Short answer question
export interface ShortAnswerQuestion extends BaseQuestion {
  qtype: 'short';
  answer_key: {
    regex: string;
  };
}

// Union type for all question types
export type Question = MCQQuestion | ImageMCQQuestion | MatchingQuestion | ReorderQuestion | ShortAnswerQuestion;

// Answer submission types
export interface MCQAnswer {
  type: 'mcq';
  selected: string;
}

export interface MatchingAnswer {
  type: 'matching';
  pairs: Record<string, string>;
}

export interface ReorderAnswer {
  type: 'reorder';
  order: string[];
}

export interface ShortAnswer {
  type: 'short';
  text: string;
}

export type Answer = MCQAnswer | MatchingAnswer | ReorderAnswer | ShortAnswer;

// Validation functions
export function validateMCQ(question: MCQQuestion, answer: MCQAnswer): boolean {
  return answer.selected === question.answer_key.correct;
}

export function validateImageMCQ(question: ImageMCQQuestion, answer: MCQAnswer): boolean {
  return answer.selected === question.answer_key.correct;
}

export function validateMatching(question: MatchingQuestion, answer: MatchingAnswer): boolean {
  const correctMap = question.answer_key.map;
  const submittedPairs = answer.pairs;
  
  // Check if every left item maps to exactly one right item
  for (const [left, right] of Object.entries(submittedPairs)) {
    if (correctMap[left] !== right) {
      return false;
    }
  }
  
  // Check if all required pairs are present
  return Object.keys(correctMap).length === Object.keys(submittedPairs).length;
}

export function validateReorder(question: ReorderQuestion, answer: ReorderAnswer): boolean {
  const correctOrder = question.answer_key.order;
  const submittedOrder = answer.order;
  
  if (correctOrder.length !== submittedOrder.length) {
    return false;
  }
  
  return correctOrder.every((item, index) => item === submittedOrder[index]);
}

export function validateShortAnswer(question: ShortAnswerQuestion, answer: ShortAnswer): boolean {
  const regex = new RegExp(question.answer_key.regex, 'i'); // case insensitive
  return regex.test(answer.text.trim());
}

// Main validation function
export function validateAnswer(question: Question, answer: Answer): boolean {
  switch (question.qtype) {
    case QUESTION_TYPES.MCQ:
      return validateMCQ(question as MCQQuestion, answer as MCQAnswer);
    case QUESTION_TYPES.IMAGE_MCQ:
      return validateImageMCQ(question as ImageMCQQuestion, answer as MCQAnswer);
    case QUESTION_TYPES.MATCHING:
      return validateMatching(question as MatchingQuestion, answer as MatchingAnswer);
    case QUESTION_TYPES.REORDER:
      return validateReorder(question as ReorderQuestion, answer as ReorderAnswer);
    case QUESTION_TYPES.SHORT:
      return validateShortAnswer(question as ShortAnswerQuestion, answer as ShortAnswer);
    default:
      return false;
  }
}

// Helper function to get correct answer for display
export function getCorrectAnswer(question: Question): string {
  switch (question.qtype) {
    case QUESTION_TYPES.MCQ:
    case QUESTION_TYPES.IMAGE_MCQ:
      const mcqQuestion = question as MCQQuestion | ImageMCQQuestion;
      const correctOption = mcqQuestion.options.find(opt => opt.key === mcqQuestion.answer_key.correct);
      return correctOption ? `${correctOption.key}: ${correctOption.text}` : 'Unknown';
    
    case QUESTION_TYPES.MATCHING:
      const matchingQuestion = question as MatchingQuestion;
      return Object.entries(matchingQuestion.answer_key.map)
        .map(([left, right]) => `${left} → ${right}`)
        .join(', ');
    
    case QUESTION_TYPES.REORDER:
      const reorderQuestion = question as ReorderQuestion;
      return reorderQuestion.answer_key.order.join(' → ');
    
    case QUESTION_TYPES.SHORT:
      return 'See explanation below';
    
    default:
      return 'Unknown';
  }
}


