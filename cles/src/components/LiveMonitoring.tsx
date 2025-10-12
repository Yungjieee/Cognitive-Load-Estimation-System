"use client";

import { useState, useEffect } from 'react';
import { liveStreamsManager } from '@/lib/liveStreams';

interface LiveMonitoringProps {
  className?: string;
}

export default function LiveMonitoring({ className = '' }: LiveMonitoringProps) {
  const [status, setStatus] = useState(liveStreamsManager.getStatus());
  const [hrData, setHrData] = useState(liveStreamsManager.getHRSparkline());
  const [attentionData, setAttentionData] = useState(liveStreamsManager.getAttentionData());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(liveStreamsManager.getStatus());
      setHrData(liveStreamsManager.getHRSparkline());
      setAttentionData(liveStreamsManager.getAttentionData());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const healthSummary = liveStreamsManager.getHealthSummary();
  const currentHR = liveStreamsManager.getCurrentHR();
  const faceDetected = liveStreamsManager.isFaceDetected();
  const averageAttention = liveStreamsManager.getAverageAttention(10);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Webcam Status */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-xs">📹</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Webcam</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <span className={`text-sm font-semibold ${
              status.webcam.active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {status.webcam.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Face:</span>
            <span className={`text-sm font-semibold ${
              faceDetected ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
            }`}>
              {faceDetected ? 'Detected' : 'Not Detected'}
            </span>
          </div>
          
          {status.webcam.error && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <span className="text-xs text-red-600 dark:text-red-400">{status.webcam.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Heart Rate Monitor */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-xs">❤️</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Heart Rate</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current:</span>
            <span className="text-lg font-bold text-red-600 dark:text-red-400">
              {currentHR} BPM
            </span>
          </div>
          
          {/* HR Sparkline */}
          <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
            <div className="h-full flex items-end gap-1">
              {hrData.slice(-30).map((point, index) => {
                const height = Math.max(4, (point.bpm - 60) / 2); // Scale to 4-32px height
                return (
                  <div
                    key={index}
                    className="bg-red-500 rounded-sm flex-1"
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>
          </div>
          
          {status.hr.error && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <span className="text-xs text-red-600 dark:text-red-400">{status.hr.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Attention Monitor */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-xs">🧠</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Attention</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Level:</span>
            <span className={`text-sm font-semibold ${
              averageAttention > 0.7 ? 'text-green-600 dark:text-green-400' :
              averageAttention > 0.4 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {Math.round(averageAttention * 100)}%
            </span>
          </div>
          
          {/* Attention Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                averageAttention > 0.7 ? 'bg-green-500' :
                averageAttention > 0.4 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${averageAttention * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* System Health */}
      {!healthSummary.overallHealthy && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-orange-600 dark:text-orange-400 text-sm">⚠️</span>
            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">System Alert</span>
          </div>
          <div className="text-xs text-orange-700 dark:text-orange-300">
            {healthSummary.issues.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}




