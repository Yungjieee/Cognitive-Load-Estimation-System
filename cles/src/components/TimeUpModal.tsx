"use client";

// import { PENALTY_EXTRA_TIME_TOTAL } from "@/lib/config";

interface TimeUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestExtraTime: () => void;
  onSkipQuestion: () => void;
  extraTimeUsed: boolean;
  originalTimeLimit: number;
}

export default function TimeUpModal({
  isOpen,
  onClose,
  onRequestExtraTime,
  onSkipQuestion,
  extraTimeUsed,
  originalTimeLimit
}: TimeUpModalProps) {
  if (!isOpen) return null;

  const handleRequestExtraTime = () => {
    onRequestExtraTime();
    onClose();
  };

  const handleSkipQuestion = () => {
    onSkipQuestion();
    onClose();
  };

  const extraTimeAmount = Math.floor(originalTimeLimit * 0.7);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 dark:text-red-400 text-2xl">⏰</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Time's Up!</h2>
          <p className="text-gray-600 dark:text-gray-300">
            What would you like to do?
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={handleRequestExtraTime}
            disabled={extraTimeUsed}
            className="w-full rounded-xl px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {extraTimeUsed ? 'Extra Time Already Used' : `Request Extra Time (+70% time, -0.01 pt)`}
          </button>
          
          <button
            onClick={handleSkipQuestion}
            className="w-full rounded-xl px-6 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Skip Question (0 points)
          </button>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          {extraTimeUsed 
            ? "Extra time already used for this question"
            : `Extra time grants ${extraTimeAmount} seconds (70% of original limit)`
          }
        </div>
      </div>
    </div>
  );
}
