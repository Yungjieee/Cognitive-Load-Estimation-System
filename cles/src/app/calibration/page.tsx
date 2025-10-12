"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { liveStreamsManager } from "@/lib/liveStreams";

export default function CalibrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subtopicId = searchParams.get("subtopic");

  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStable, setFaceStable] = useState(false);
  const [hrSignal, setHrSignal] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(10);
  const [calibrationPassed, setCalibrationPassed] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [streamStatus, setStreamStatus] = useState(liveStreamsManager.getStatus());
  const [currentHR, setCurrentHR] = useState(75);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize streams on mount
  useEffect(() => {
    const initializeStreams = async () => {
      try {
        await liveStreamsManager.initialize();
        setStreamStatus(liveStreamsManager.getStatus());
        
        // Connect video element to webcam stream
        if (videoRef.current) {
          const stream = liveStreamsManager.getWebcamStream();
          if (stream) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (error) {
        console.warn('Failed to initialize streams:', error);
      }
    };

    initializeStreams();

    // Update face detection status
    const faceCheckInterval = setInterval(() => {
      const status = liveStreamsManager.getStatus();
      setStreamStatus(status);
      setFaceDetected(status.webcam.faceDetected);
      
      // Check if face has been stable for 8+ seconds
      if (status.webcam.faceDetected && !faceStable) {
        setTimeout(() => {
          if (liveStreamsManager.getStatus().webcam.faceDetected) {
            setFaceStable(true);
          }
        }, 8000);
      }
    }, 1000);

    return () => {
      clearInterval(faceCheckInterval);
      liveStreamsManager.cleanup();
    };
  }, [faceStable]);

  useEffect(() => {
    if (calibrating && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        // Get real HR data from streams
        const hr = liveStreamsManager.getCurrentHR();
        setCurrentHR(hr);
        setHrSignal(prev => [...prev.slice(-9), hr]);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (calibrating && countdown === 0) {
      setCalibrating(false);
      setCalibrationPassed(true);
    }
  }, [calibrating, countdown]);

  function startCalibration() {
    setCalibrating(true);
    setCountdown(10);
    setHrSignal([]);
  }

  function startTask() {
    router.push(`/session?subtopic=${subtopicId}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">🔧</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Device Calibration</h1>
            <p className="text-gray-600 dark:text-gray-300">Ensure your devices are ready for monitoring</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Checklist */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">✅</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Preparation Checklist</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  {faceDetected && <div className="w-3 h-3 rounded-full bg-green-500" />}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Good posture, face visible</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  {faceStable && <div className="w-3 h-3 rounded-full bg-green-500" />}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Stable lighting</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Heart-rate sensor connected</span>
              </div>
            </div>
          </div>

          {/* Webcam Preview */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📹</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Webcam Preview</h2>
            </div>
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 relative overflow-hidden">
              {streamStatus.webcam.active ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror the video
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-bg flex items-center justify-center">
                      <span className="text-white text-2xl">📷</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Camera Preview</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {streamStatus.webcam.error || 'Camera not available'}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Face detection indicator */}
              <div className="absolute top-2 right-2">
                <div className={`w-4 h-4 rounded-full ${
                  faceDetected 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`} />
              </div>
            </div>
            
            <div className="mt-4 flex gap-2 justify-center">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${faceDetected ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                Face: {faceDetected ? 'Detected' : 'Not detected'}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${faceStable ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                Stable: {faceStable ? 'Yes' : 'No'}
              </div>
            </div>
          </div>

          {/* HR Chart */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">❤️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Heart Rate Signal</h2>
            </div>
            
            <div className="mb-4">
              <div className="text-2xl font-bold gradient-text">{currentHR}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">bpm</div>
            </div>
            
            <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
              {hrSignal.length > 0 ? (
                <div className="h-full flex items-end gap-1">
                  {hrSignal.map((value, i) => {
                    const maxHR = Math.max(...hrSignal);
                    const minHR = Math.min(...hrSignal);
                    const range = maxHR - minHR || 1;
                    const height = Math.max(2, ((value - minHR) / range) * 100);
                    
                    return (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-purple-500 to-pink-500 rounded-sm flex-1 min-h-[2px]"
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {calibrating ? `Starting in ${countdown}s...` : 'Ready to calibrate'}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {calibrating && (
              <div className="text-center mt-4">
                <div className="text-3xl font-bold gradient-text">{countdown}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">seconds remaining</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          {!calibrationPassed ? (
            <button
              onClick={startCalibration}
              disabled={calibrating || !faceDetected}
              className="rounded-xl px-8 py-4 btn-primary text-white font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
            >
              {calibrating ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Calibrating...
                </div>
              ) : (
                "Start Calibration"
              )}
            </button>
          ) : (
            <div className="text-center space-y-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-green-200 dark:border-green-800 shadow-lg">
                <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
                </div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">Calibration Complete!</h3>
                <p className="text-green-700 dark:text-green-300 text-sm">Your devices are ready for monitoring</p>
              </div>
              <button
                onClick={startTask}
                className="rounded-xl px-8 py-4 btn-primary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

