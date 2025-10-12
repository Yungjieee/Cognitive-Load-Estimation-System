"use client";

import { useState, useEffect } from 'react';
import { supportNudgesManager, NudgeSuggestion } from '@/lib/supportNudges';
import { Question } from '@/lib/questionTypes';

interface SupportPanelProps {
  question: Question;
  hintsUsed: number;
  onUseHint: (type: 'hint' | 'example') => void;
  className?: string;
}

export default function SupportPanel({ question, hintsUsed, onUseHint, className = '' }: SupportPanelProps) {
  const [suggestions, setSuggestions] = useState<NudgeSuggestion[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [isRestActive, setIsRestActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestions(supportNudgesManager.getSuggestions());
      setIsRestActive(supportNudgesManager.isRestActive());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleUseHint = (type: 'hint' | 'example') => {
    onUseHint(type);
    if (type === 'hint') {
      setShowHint(true);
    } else {
      setShowExample(true);
    }
  };

  const handleSuggestionAction = (suggestion: NudgeSuggestion) => {
    if (suggestion.action) {
      suggestion.action();
    }
  };

  const handleDismissSuggestion = (type: string) => {
    supportNudgesManager.dismissSuggestion(type);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Support Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-blue-200/30 dark:border-blue-800/30 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-xs">💡</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Suggestions</h3>
          </div>
          
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div key={index} className={`p-3 rounded-lg border ${
                suggestion.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                suggestion.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {suggestion.message}
                    </p>
                    {suggestion.action && (
                      <button
                        onClick={() => handleSuggestionAction(suggestion)}
                        className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        {suggestion.type === 'rest' ? 'Start Rest' : 'Use Hint'}
                      </button>
                    )}
                  </div>
                  {suggestion.dismissible && (
                    <button
                      onClick={() => handleDismissSuggestion(suggestion.type)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rest Break Status */}
      {isRestActive && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600 dark:text-green-400 text-sm">🧘</span>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">Rest Break Active</span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300">
            Take your time to relax. Click "Resume" when you're ready to continue.
          </p>
        </div>
      )}

      {/* Hints and Examples */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-xs">💡</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Support Tools</h3>
        </div>
        
        <div className="space-y-3">
          {/* Hint */}
          {question.hint && (
            <div>
              <button
                onClick={() => handleUseHint('hint')}
                className="w-full text-left text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                {showHint ? "Hide Hint" : "Show Hint"} (-1 point)
              </button>
              {showHint && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  {question.hint}
                </div>
              )}
            </div>
          )}
          
          {/* Example */}
          {question.example && (
            <div>
              <button
                onClick={() => handleUseHint('example')}
                className="w-full text-left text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                {showExample ? "Hide Example" : "Show Example"} (-1 point)
              </button>
              {showExample && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  {question.example}
                </div>
              )}
            </div>
          )}
          
          {/* Hints Used Counter */}
          {hintsUsed > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Hints used this question: {hintsUsed}
            </div>
          )}
        </div>
      </div>

      {/* Encouragement */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-green-200/30 dark:border-green-800/30 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span className="text-green-600 dark:text-green-400 text-xs">✨</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Encouragement</h3>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          You're doing great! Keep up the good work and stay focused.
        </div>
      </div>
    </div>
  );
}




