"use client";

import { useState, useEffect } from "react";
import { Question } from "@/lib/questionTypes";
import { PENALTY_HINT_PER_USE } from "@/lib/config";
import ImageLightbox from "./ImageLightbox";

interface HintPanelProps {
  question: Question;
  hintsUsed: number;
  onUseHint: (type: 'hint' | 'example') => void;
  disabled?: boolean;
  shouldGlow?: boolean;
  forceExpandExample?: boolean;
}

export default function HintPanel({
  question,
  hintsUsed,
  onUseHint,
  disabled = false,
  shouldGlow = false,
  forceExpandExample = false
}: HintPanelProps) {
  const [showHint1, setShowHint1] = useState(false);
  const [showHint2, setShowHint2] = useState(false);
  const [showHint3, setShowHint3] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Reset hint UI state when question changes
  useEffect(() => {
    setShowHint1(false);
    setShowHint2(false);
    setShowHint3(false);
    setShowExample(false);
  }, [question.id]);

  // Auto-expand example when support popup accepted
  useEffect(() => {
    if (forceExpandExample && !showExample) {
      // Trigger the example expansion
      onUseHint('example');
      setShowExample(true);
    }
  }, [forceExpandExample, showExample, onUseHint]);

  const maxHints = 3;
  const canUseHint1 = hintsUsed < 1;
  const canUseHint2 = hintsUsed < 2;
  const canUseHint3 = hintsUsed < 3;

  const handleHintToggle = (hintNumber: 1 | 2 | 3) => {
    if (disabled) return;

    const hintUsed = hintsUsed >= hintNumber;
    
    switch (hintNumber) {
      case 1:
        if (!hintUsed && !showHint1) {
          onUseHint('hint');
        }
        setShowHint1(!showHint1);
        break;
      case 2:
        if (!hintUsed && !showHint2) {
          onUseHint('hint');
        }
        setShowHint2(!showHint2);
        break;
      case 3:
        if (!hintUsed && !showHint3) {
          onUseHint('hint');
        }
        setShowHint3(!showHint3);
        break;
    }
  };

  const handleExampleToggle = () => {
    if (disabled) return;
    
    if (!showExample) {
      onUseHint('example');
    }
    setShowExample(!showExample);
  };

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 shadow-lg transition-all duration-500 ${
      shouldGlow
        ? 'border-2 border-purple-400 dark:border-purple-500 shadow-purple-500/50 dark:shadow-purple-400/50 shadow-2xl animate-pulse'
        : 'border border-purple-200/30 dark:border-purple-800/30'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
          <span className="text-white text-xs">💡</span>
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Hints & Support</h3>
      </div>

      <div className="space-y-3">
        {/* Hint 1 */}
        <div className="space-y-2">
          <button
            onClick={() => handleHintToggle(1)}
            disabled={disabled}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
              showHint1
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Hint 1 (-0.01)
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {showHint1 ? '▼' : '▶'}
              </span>
            </div>
          </button>
          
          {showHint1 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {question.hint || "No hint available for this question."}
              </p>
            </div>
          )}
        </div>

        {/* Hint 2 */}
        <div className="space-y-2">
          <button
            onClick={() => handleHintToggle(2)}
            disabled={disabled}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
              showHint2
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Hint 2 (-0.01)
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {showHint2 ? '▼' : '▶'}
              </span>
            </div>
          </button>
          
          {showHint2 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {(question as any).hints?.[1] || question.hint || "No additional hint available for this question."}
              </p>
            </div>
          )}
        </div>

        {/* Hint 3 */}
        <div className="space-y-2">
          <button
            onClick={() => handleHintToggle(3)}
            disabled={disabled}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
              showHint3
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Hint 3 (-0.01)
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {showHint3 ? '▼' : '▶'}
              </span>
            </div>
          </button>
          
          {showHint3 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {(question as any).hints?.[2] || question.hint || "No additional hint available for this question."}
              </p>
            </div>
          )}
        </div>

        {/* Example */}
        <div className="space-y-2">
          <button
            onClick={handleExampleToggle}
            disabled={disabled}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
              showExample
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Example <span className="text-red-500">(-{PENALTY_HINT_PER_USE}pt)</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {showExample ? '▼' : '▶'}
              </span>
            </div>
          </button>
          
          {showExample && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
              {question.example && (
                <p className="text-sm text-green-800 dark:text-green-200">
                  {question.example}
                </p>
              )}
              {(question as any).example_image_url && (
                <div className="relative group">
                  <img
                    src={(question as any).example_image_url}
                    alt="Example visualization"
                    className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxImage((question as any).example_image_url)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to zoom
                  </div>
                </div>
              )}
              {!question.example && !(question as any).example_image_url && (
                <p className="text-sm text-green-800 dark:text-green-200">
                  No example available for this question.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Usage Summary */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Hints used:</span>
            <span className="font-medium">{hintsUsed}/3</span>
          </div>
          <div className="flex justify-between">
            <span>Example used:</span>
            <span className="font-medium">{showExample ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span>Penalty:</span>
            <span className="font-medium text-red-500">-{Number(((hintsUsed + (showExample ? 1 : 0)) * PENALTY_HINT_PER_USE).toFixed(2))} pts</span>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt="Example visualization"
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
