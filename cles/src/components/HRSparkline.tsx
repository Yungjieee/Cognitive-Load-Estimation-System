"use client";

import { useState, useEffect, useRef } from 'react';
import { useRealtimeUpdates } from '@/lib/hooks/useRealtimeUpdates';

interface HRSparklineProps {
  sessionId: number;
  isActive: boolean;
  className?: string;
}

interface HRDataPoint {
  timestamp: number;
  bpm: number;
}

export default function HRSparkline({ sessionId, isActive, className = '' }: HRSparklineProps) {
  const [hrData, setHrData] = useState<HRDataPoint[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const maxDataPoints = 100; // Keep last 100 data points for sparkline
  
  // Use real-time updates from ESP32
  const { currentBPM, isConnected } = useRealtimeUpdates(sessionId);

  // Handle real-time HR data updates
  useEffect(() => {
    if (!isActive) {
      setHrData([]);
      return;
    }

    // Add new BPM data point when currentBPM changes
    if (currentBPM !== null) {
      const newDataPoint: HRDataPoint = {
        timestamp: Date.now(),
        bpm: currentBPM
      };

      setHrData(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only the last maxDataPoints
        return updated.length > maxDataPoints ? updated.slice(-maxDataPoints) : updated;
      });
    }
  }, [currentBPM, isActive, maxDataPoints]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Draw sparkline
  useEffect(() => {
    if (!canvasRef.current || hrData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (hrData.length < 2) return;

    // Find min/max BPM for scaling
    const bpmValues = hrData.map(d => d.bpm);
    const minBPM = Math.min(...bpmValues);
    const maxBPM = Math.max(...bpmValues);
    const bpmRange = maxBPM - minBPM || 1;

    // Draw sparkline
    ctx.beginPath();
    ctx.strokeStyle = isConnected ? '#10b981' : '#6b7280'; // Green if connected, gray if not
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    hrData.forEach((point, index) => {
      const x = (index / (hrData.length - 1)) * width;
      const y = height - ((point.bpm - minBPM) / bpmRange) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw current BPM indicator
    if (currentBPM && hrData.length > 0) {
      const lastPoint = hrData[hrData.length - 1];
      const x = width - 1;
      const y = height - ((lastPoint.bpm - minBPM) / bpmRange) * height;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = isConnected ? '#10b981' : '#6b7280';
      ctx.fill();
    }
  }, [hrData, currentBPM, isConnected]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Heart icon */}
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isConnected ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
        }`}>
          <span className="text-sm">❤️</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex-1 min-w-0">
        <canvas
          ref={canvasRef}
          width={120}
          height={40}
          className="w-full h-10"
        />
      </div>

      {/* Current BPM */}
      <div className="flex-shrink-0 text-right">
        <div className={`text-sm font-mono ${
          isConnected ? 'text-gray-900 dark:text-white' : 'text-gray-400'
        }`}>
          {currentBPM ? `${currentBPM} BPM` : '-- BPM'}
        </div>
        <div className={`text-xs ${
          isConnected ? 'text-green-600' : 'text-gray-400'
        }`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </div>
  );
}
