"use client";

import { useState, useEffect, useRef } from "react";
import { liveStreamsManager } from "@/lib/liveStreams";
import { COGNITIVE_LOAD_WEIGHTS } from "@/lib/config";
import HRSparkline from "./HRSparkline";

interface CognitiveLoad {
  overall: number;
  intrinsic: number;
  extraneous: number;
  germane: number;
}

interface SessionRightPanelProps {
  sessionId: number;
  difficulty: number;
  hintsUsed: number;
  timeWarning: boolean;
  offscreenRate?: number;
}

export default function SessionRightPanel({
  sessionId,
  difficulty,
  hintsUsed,
  timeWarning,
  offscreenRate = 0
}: SessionRightPanelProps) {
  const [streamStatus, setStreamStatus] = useState(liveStreamsManager.getStatus());
  const [attentionStatus, setAttentionStatus] = useState<'FOCUSED' | 'DISTRACTED'>('DISTRACTED');
  const [cognitiveLoad, setCognitiveLoad] = useState<CognitiveLoad>({
    overall: 0.5,
    intrinsic: 0.2,
    extraneous: 0.2,
    germane: 0.6
  });
  const imgRef = useRef<HTMLImageElement>(null);

  // Initialize streams and update data
  useEffect(() => {
    const initializeStreams = async () => {
      try {
        await liveStreamsManager.initialize();
        setStreamStatus(liveStreamsManager.getStatus());
      } catch (error) {
        console.warn('Failed to initialize streams:', error);
      }
    };

    initializeStreams();

    // Update data every second
    const interval = setInterval(async () => {
      setStreamStatus(liveStreamsManager.getStatus());

      // Fetch attention status from Python backend
      try {
        const response = await fetch('http://localhost:5001/status');
        if (response.ok) {
          const data = await response.json();
          setAttentionStatus(data.status as 'FOCUSED' | 'DISTRACTED');
        }
      } catch (error) {
        // Silently fail - backend might not be available
      }

      // Update cognitive load
      updateCognitiveLoad();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [difficulty, hintsUsed, timeWarning, offscreenRate]);

  // Update cognitive load based on current state
  const updateCognitiveLoad = () => {
    const attentionAvg = liveStreamsManager.getAverageAttention(10);
    
    // Mock cognitive load calculation as per spec
    const intrinsic = difficulty / 5; // difficulty-based intrinsic load
    const extraneous = 0.2 + 0.5 * offscreenRate + (timeWarning ? 0.2 : 0);
    const germane = Math.max(0, Math.min(1, attentionAvg * (1 - hintsUsed / 3)));
    const overall = COGNITIVE_LOAD_WEIGHTS.w1 * (1 - attentionAvg) + 
                   COGNITIVE_LOAD_WEIGHTS.w2 * extraneous + 
                   COGNITIVE_LOAD_WEIGHTS.w3 * intrinsic + 
                   COGNITIVE_LOAD_WEIGHTS.w4 * (1 - germane);

    setCognitiveLoad({
      overall: Math.max(0, Math.min(1, overall)),
      intrinsic: Math.max(0, Math.min(1, intrinsic)),
      extraneous: Math.max(0, Math.min(1, extraneous)),
      germane: Math.max(0, Math.min(1, germane))
    });
  };

  // Render cognitive load bar
  const renderLoadBar = (label: string, value: number, color: string) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-gray-800 dark:text-gray-200 font-medium">
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Webcam Preview */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-white text-xs">📹</span>
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Webcam</h3>
        </div>
        
        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 relative overflow-hidden">
          <img
            ref={imgRef}
            src="http://localhost:5001/video_feed"
            alt="Attention Monitor"
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Face detection indicator */}
          <div className="absolute top-2 right-2">
            <div className={`w-3 h-3 rounded-full ${
              streamStatus.webcam.faceDetected
                ? 'bg-green-500'
                : 'bg-red-500'
            }`} />
          </div>
        </div>

        <div className="mt-2 flex gap-2 justify-center flex-wrap">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${streamStatus.webcam.faceDetected ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
            Face: {streamStatus.webcam.faceDetected ? 'Detected' : 'Not detected'}
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${attentionStatus === 'FOCUSED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>
            {attentionStatus}
          </div>
        </div>
      </div>

      {/* Heart Rate */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-white text-xs">❤️</span>
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Heart Rate</h3>
        </div>
        <HRSparkline
          sessionId={sessionId}
          isActive={true}
          className="w-full"
        />
      </div>

      {/* Cognitive Load Panel */}
      {/* <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-white text-xs">🧠</span>
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Cognitive Load</h3>
        </div>
        
        <div className="space-y-3">
          {renderLoadBar('Overall', cognitiveLoad.overall, 'bg-gradient-to-r from-red-500 to-orange-500')}
          {renderLoadBar('Intrinsic', cognitiveLoad.intrinsic, 'bg-gradient-to-r from-blue-500 to-cyan-500')}
          {renderLoadBar('Extraneous', cognitiveLoad.extraneous, 'bg-gradient-to-r from-yellow-500 to-orange-500')}
          {renderLoadBar('Germane', cognitiveLoad.germane, 'bg-gradient-to-r from-green-500 to-emerald-500')}
        </div>
      </div> */}

      {/* Stream Health */}
      {!streamStatus.webcam.active ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 text-sm">⚠️</span>
            <div className="text-xs text-yellow-800 dark:text-yellow-200">
              Webcam not available
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
