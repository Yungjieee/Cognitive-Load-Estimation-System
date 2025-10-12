"use client";

import { useState, useEffect } from "react";
import { STRESSOR_MESSAGES } from "@/lib/config";

interface StressorBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
  timeLimit: number;
  timeElapsed: number;
}

export default function StressorBanner({
  isVisible,
  onDismiss,
  timeLimit,
  timeElapsed
}: StressorBannerProps) {
  const [message, setMessage] = useState("");

  // Select random message when banner becomes visible
  useEffect(() => {
    if (isVisible && !message) {
      const randomMessage = STRESSOR_MESSAGES[Math.floor(Math.random() * STRESSOR_MESSAGES.length)];
      setMessage(randomMessage);
    }
  }, [isVisible, message]);

  // Reset message when banner is dismissed
  useEffect(() => {
    if (!isVisible) {
      setMessage("");
    }
  }, [isVisible]);

  if (!isVisible || !message) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="text-yellow-600 dark:text-yellow-400 text-lg">💭</span>
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            {message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 text-xl font-bold leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Hook to manage stressor banner timing
export function useStressorBanner(timeLimit: number, timeElapsed: number) {
  const [showBanner, setShowBanner] = useState(false);
  const [bannerShown, setBannerShown] = useState(false);

  useEffect(() => {
    if (bannerShown || timeElapsed <= 0) {
      return;
    }

    // Calculate when to show banner (25-50% of time limit)
    const minTime = timeLimit * 0.25;
    const maxTime = timeLimit * 0.50;
    
    // Random time within the window
    const showTime = minTime + Math.random() * (maxTime - minTime);

    if (timeElapsed >= showTime) {
      setShowBanner(true);
      setBannerShown(true);
    }
  }, [timeElapsed, timeLimit, bannerShown]);

  const dismissBanner = () => {
    setShowBanner(false);
  };

  const resetBanner = () => {
    setShowBanner(false);
    setBannerShown(false);
  };

  return {
    showBanner,
    dismissBanner,
    resetBanner
  };
}
