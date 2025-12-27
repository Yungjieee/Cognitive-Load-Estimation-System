'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SupportPopupModalProps {
  isOpen: boolean;
  onYes: () => void;
  onNo: () => void;
}

export default function SupportPopupModal({
  isOpen,
  onYes,
  onNo
}: SupportPopupModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onNo}
          />

          {/* Slide-in modal from right */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200,
              duration: 0.3
            }}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50
                       w-[400px] bg-gradient-to-br from-blue-50 to-purple-50
                       dark:from-blue-900/90 dark:to-purple-900/90
                       rounded-l-2xl shadow-2xl border-l-4 border-blue-400
                       p-8 mr-4"
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16
                          bg-blue-100 dark:bg-blue-800/50 rounded-full mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Message */}
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white text-center mb-3">
              Need Some Help?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6 leading-relaxed">
              Your cognitive load seems to be increasing. Would you like to view
              some worked examples to help you understand the problem better?
            </p>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onNo}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300
                         dark:bg-gray-700 dark:hover:bg-gray-600
                         text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors
                         duration-200"
              >
                No, Thanks
              </button>
              <button
                onClick={onYes}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700
                         text-white font-medium rounded-lg transition-colors
                         duration-200 shadow-md hover:shadow-lg"
              >
                Yes, Show Example
              </button>
            </div>

            {/* Subtle hint that timer is still running */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4 italic">
              Timer continues running...
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
