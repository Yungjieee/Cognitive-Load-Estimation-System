"use client";

import { useMemo } from "react";
import { Question } from "@/lib/questionTypes";
import { ENCOURAGEMENT_MESSAGES } from "@/lib/config";

interface RevealCardProps {
  question: Question;
  isCorrect: boolean;
  pointsAwarded: number;
  onNext: () => void;
  isLastQuestion?: boolean;
  isFinishing?: boolean;
}

export default function RevealCard({
  question,
  isCorrect,
  pointsAwarded,
  onNext,
  isLastQuestion = false,
  isFinishing = false
}: RevealCardProps) {
  // Get deterministic encouragement message based on question ID and correctness
  const encouragementMessage = useMemo(() => {
    const messages = isCorrect 
      ? ENCOURAGEMENT_MESSAGES.correct 
      : ENCOURAGEMENT_MESSAGES.incorrect;
    
    // Use question ID (string or number) to get a deterministic index
    const idStr = String(question.id);
    const hash = idStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % messages.length;
    return messages[index];
  }, [question.id, isCorrect]);

  // Format correct answer based on question type
  const formatCorrectAnswer = () => {
    switch (question.qtype) {
      case 'mcq':
      case 'image_mcq':
        const correctOption = question.options?.find(opt => opt.key === question.answer_key.correct);
        return correctOption ? `${correctOption.key}. ${correctOption.text}` : question.answer_key.correct;
      
      case 'matching':
        if (question.answer_key.map) {
          return Object.entries(question.answer_key.map)
            .map(([left, right]) => `${left} → ${right}`)
            .join(', ');
        }
        return 'See correct matching above';
      
      case 'reorder':
        if (question.answer_key.order) {
          return question.answer_key.order.join(' → ');
        }
        return 'See correct order above';
      
      case 'short':
        return question.answer_key.regex || 'Correct answer';
      
      default:
        return 'Correct answer';
    }
  };

  // Get explanation text: show DB explanation if present; otherwise fall back by type
  const getExplanation = () => {
    if (question.explanation) {
      return question.explanation;
    }
    switch (question.qtype) {
      case 'mcq':
      case 'image_mcq':
        return `The correct answer is ${question.answer_key.correct}.`;
      case 'matching':
        return 'Review the correct mapping above.';
      case 'reorder':
        return 'Review the correct order above.';
      case 'short':
        return 'Your answer should match the expected pattern.';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <div className="text-center">
        <div className={`text-4xl mb-3 ${
          isCorrect 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {isCorrect ? '✓' : '✗'}
        </div>
        <div className={`text-2xl font-bold mb-2 ${
          isCorrect 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Points awarded: <span className="font-semibold">{pointsAwarded}</span>
        </div>
      </div>
      
      {/* Correct Answer */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Correct Answer:</h3>
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          {formatCorrectAnswer()}
        </p>
      </div>
      
      {/* Explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Explanation:</h3>
        <p className="text-gray-700 dark:text-gray-300">
          {getExplanation()}
        </p>
      </div>
      
      {/* Encouragement */}
      <div className={`rounded-lg p-4 ${
        isCorrect 
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
      }`}>
        <p className={`font-medium ${
          isCorrect 
            ? 'text-green-800 dark:text-green-200'
            : 'text-orange-800 dark:text-orange-200'
        }`}>
          {encouragementMessage}
        </p>
      </div>
      
      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={isFinishing}
        className="w-full rounded-xl px-6 py-3 btn-primary text-white font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isFinishing && (
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {isFinishing ? 'Finishing Session...' : (isLastQuestion ? 'Finish Session' : 'Next Question')}
      </button>
    </div>
  );
}
