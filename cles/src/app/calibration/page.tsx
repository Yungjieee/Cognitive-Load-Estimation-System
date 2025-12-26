"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { liveStreamsManager } from "@/lib/liveStreams";
import HRSparkline from "@/components/HRSparkline";
import { useSensorConnection } from "@/lib/hooks/useSensorConnection";
import { useDeviceCommands } from "@/lib/hooks/useDeviceCommands";
import { useRealtimeUpdates } from "@/lib/hooks/useRealtimeUpdates";
import { DatabaseClient } from "@/lib/database";
import { supabase } from "@/lib/supabase";

export default function CalibrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subtopicId = searchParams.get("subtopic") || "arrays"; // Default to arrays if not specified

  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStable, setFaceStable] = useState(false);
  const [attentionStatus, setAttentionStatus] = useState<'FOCUSED' | 'DISTRACTED'>('DISTRACTED');
  const [countdown, setCountdown] = useState(10);
  const [calibrationPassed, setCalibrationPassed] = useState(false); // Temporarily set to true for testing
  const [calibrating, setCalibrating] = useState(false);
  const [rmssdBaseline, setRmssdBaseline] = useState<number | null>(null);
  const rmssdCalculatedRef = useRef(false); // Track if RMSSD has been calculated
  const [streamStatus, setStreamStatus] = useState(liveStreamsManager.getStatus());
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dbSessionId, setDbSessionId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<'support' | 'no_support'>('support');
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false); // Temporarily set to true for testing
  const [environmentNoise, setEnvironmentNoise] = useState(5); // Default to middle value (0-10 scale)

  // Sensor connection status
  const { sensorStatus, isConnected, isOnline, isChecking, hasError } = useSensorConnection();
  
  // Device commands
  const { isLoading: isCommandLoading, sendCommand, startCalibration: sendCalibrationCommand, stopSession, lastResult } = useDeviceCommands();
  
  // Real-time updates from ESP32
  const { calibrationState, currentBPM, sensorStatus: wsSensorStatus, resetCalibration } = useRealtimeUpdates(dbSessionId || undefined);
  
  // Unified sensor status - prioritize WebSocket status if available
  const unifiedSensorStatus = wsSensorStatus === 'online' ? 'online' : 
                              wsSensorStatus === 'offline' ? 'offline' : 
                              isOnline ? 'online' : 'offline';

  // Load user data on mount (but DON'T create session yet)
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('User not authenticated - redirecting to login...');
          alert('Please log in first to use the calibration feature');
          router.push('/auth/sign-in?redirect=/calibration');
          return;
        }
        
        setUserId(user.id);
        console.log('✅ User authenticated:', user.id);
        
        // Load user settings
        const { data: userProfile } = await supabase
          .from('users')
          .select('settings_mode')
          .eq('id', user.id)
          .single();
          
        if (userProfile?.settings_mode) {
          setMode(userProfile.settings_mode);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    
    loadUser();
  }, [router]);

  // Initialize streams on mount
  useEffect(() => {
    const initializeStreams = async () => {
      try {
        // Services auto-start via instrumentation.ts
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

    // Update face detection status and attention status
    const faceCheckInterval = setInterval(async () => {
      const status = liveStreamsManager.getStatus();
      setStreamStatus(status);
      setFaceDetected(status.webcam.faceDetected);

      // Fetch attention status from Python backend
      try {
        const response = await fetch('http://localhost:5001/status');
        if (response.ok) {
          const data = await response.json();
          setAttentionStatus(data.status as 'FOCUSED' | 'DISTRACTED');
        }
      } catch (error) {
        console.warn('Failed to fetch attention status:', error);
      }

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
      }, 1000);
      return () => clearTimeout(timer);
    } else if (calibrating && countdown === 0) {
      setCalibrating(false);
      // Don't set calibrationPassed=true here - wait for RMSSD calculation
      // setCalibrationPassed(true);  // Moved to after RMSSD calculation
    }
  }, [calibrating, countdown]);

  // Define calculateRMSSDBaseline function before useEffect
  const calculateRMSSDBaseline = useCallback(async () => {
    try {
      // Use the actual dbSessionId from state
      const sessionIdToUse = dbSessionId;
      
      if (!sessionIdToUse) {
        console.error('❌ No session ID for RMSSD calculation');
        console.error('dbSessionId state:', dbSessionId);
        return;
      }

      console.log(`📊 Calculating RMSSD baseline for session ${sessionIdToUse}...`);
      const response = await fetch(`/api/sessions/${sessionIdToUse}/calculate-baseline`, {
        method: 'POST'
      });
      
      console.log(`📡 API Response status: ${response.status}`);
      const data = await response.json();
      console.log(`📡 API Response data:`, data);
      
      if (data.success) {
        console.log(`✅ RMSSD baseline calculated: ${data.rmssdBase.toFixed(2)}ms from ${data.beatCount} beats`);
        console.log(`💾 Storing RMSSD baseline in state: ${data.rmssdBase}`);
        
        // Store RMSSD baseline for display
        setRmssdBaseline(data.rmssdBase);
        setCalibrationPassed(true);
        
        console.log(`✅ RMSSD baseline state updated: ${data.rmssdBase}`);
      } else {
        console.error('Failed to calculate RMSSD:', data.error);
        console.error('Response data:', data);
        // If not enough beats, require recalibration
        if (data.beatCount !== undefined && data.beatCount < 10) {
          setCalibrating(false);
          setCountdown(0);
          alert(`Only ${data.beatCount} beats detected. Please try calibration again to ensure at least 10 beats are captured.`);
        }
      }
    } catch (error) {
      console.error('Error calculating RMSSD:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
    }
  }, [dbSessionId]);

  // Listen for calibration_complete message from ESP32
  useEffect(() => {
    console.log('🔍 calibrationState check:', {
      isComplete: calibrationState.isComplete,
      calibrationPassed,
      dbSessionId,
      shouldCalculate: calibrationState.isComplete && !calibrationPassed && dbSessionId
    });
    
    // Check if RMSSD hasn't been calculated yet
    const needsCalculation = calibrationState.isComplete && !rmssdCalculatedRef.current && dbSessionId;
    
    if (needsCalculation) {
      console.log('📡 Received calibration_complete from ESP32, calculating RMSSD...');
      console.log('📡 RMSSD calculation state:', { 
        isComplete: calibrationState.isComplete, 
        hasRmssd: !!rmssdBaseline,
        alreadyCalculated: rmssdCalculatedRef.current,
        dbSessionId 
      });
      
      // Calculate RMSSD directly here to avoid dependency issues
      const calculateBaseline = async () => {
        try {
          const sessionIdToUse = dbSessionId;
          
          if (!sessionIdToUse) {
            console.error('❌ No session ID for RMSSD calculation');
            return;
          }

          console.log(`📊 Calculating RMSSD baseline for session ${sessionIdToUse}...`);
          const response = await fetch(`/api/sessions/${sessionIdToUse}/calculate-baseline`, {
            method: 'POST'
          });
          
          console.log(`📡 API Response status: ${response.status}`);
          const data = await response.json();
          console.log(`📡 API Response data:`, data);
          
          if (data.success) {
            console.log(`✅ RMSSD baseline calculated: ${data.rmssdBase.toFixed(2)}ms from ${data.beatCount} beats`);
            setRmssdBaseline(data.rmssdBase);
            setCalibrationPassed(true);
            setShowEnvironmentModal(true); // Show environment modal immediately
            rmssdCalculatedRef.current = true; // Mark as calculated only on success
          } else {
            // Handle insufficient beats gracefully
            if (data.beatCount !== undefined && data.beatCount < 10) {
              console.log(`⚠️ Insufficient beats for calibration: ${data.beatCount} beats detected. User can retry.`);
              setCalibrating(false);
              setCountdown(0);
              alert(`Only ${data.beatCount} beats detected during calibration. Please ensure your sensor is properly connected and try again.`);
              // Reset calibration state so user can retry
              resetCalibration();
              rmssdCalculatedRef.current = false; // Allow retry
            } else {
              // Other errors
              console.error('Failed to calculate RMSSD:', data.error);
              setCalibrating(false);
              setCountdown(0);
              alert('Calibration failed. Please try again.');
              resetCalibration();
              rmssdCalculatedRef.current = false;
            }
          }
        } catch (error) {
          console.error('Error calculating RMSSD:', error);
          setCalibrating(false);
          setCountdown(0);
          alert('Error during calibration. Please try again.');
          resetCalibration();
          rmssdCalculatedRef.current = false; // Allow retry
        }
      };
      
      calculateBaseline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // rmssdBaseline is checked in condition, not needed as dependency
  }, [calibrationState.isComplete, calibrationPassed, dbSessionId]);

  async function startCalibration() {
    try {
      // Reset RMSSD calculation tracking for new calibration
      rmssdCalculatedRef.current = false;
      setRmssdBaseline(null);
      
      let sessionId = dbSessionId;
      
      // First, create database session if not exists
      if (!sessionId) {
        if (!userId) {
          console.error('❌ User not logged in');
          alert('Please log in first');
          router.push('/auth/sign-in?redirect=/calibration');
          return;
        }
        
        if (!subtopicId) {
          console.error('❌ Missing subtopicId (this should not happen with default)');
          return;
        }
        
        console.log('📝 Creating database session...');
        console.log('   User ID:', userId);
        console.log('   Subtopic:', subtopicId);
        
        // Get subtopic ID from key
        const subtopic = await DatabaseClient.getSubtopic(subtopicId);
        if (!subtopic) {
          console.error('❌ Invalid subtopic:', subtopicId);
          alert(`Invalid subtopic: ${subtopicId}. Using default "arrays"`);
          return;
        }
        
        // Ensure user record exists
        const { data: { user } } = await supabase.auth.getUser();
        await DatabaseClient.ensureUserRecord(userId, user?.email || '');
        
        // Create database session
        const dbSession = await DatabaseClient.createSession({
          user_id: userId,
          subtopic_id: subtopic.id,
          mode: mode || 'support'
        });
        
        console.log('✅ Database session created:', dbSession.id);
        sessionId = dbSession.id;
        setDbSessionId(sessionId);
      }
      
      // Now send calibrate command to ESP32
      if (!sessionId) {
        console.error('❌ Database session creation failed');
        return;
      }
      
      // Reset calibration state
      resetCalibration();
      
      // Send calibrate command only - ESP32 will handle starting/stopping session
      console.log(`📡 Sending calibrate command for session ${sessionId}...`);
      const calibrateResult = await sendCommand(sessionId, 'calibrate');
      
      if (calibrateResult.success) {
        setCalibrating(true);
        setCountdown(10);
        console.log(`✅ Calibration started for session ID: ${sessionId}`);
        console.log('⏳ Waiting for ESP32 to send calibration_done message...');
      } else {
        console.error('❌ Failed to send calibration command:', calibrateResult.error);
      }
    } catch (error) {
      console.error('❌ Error starting calibration:', error);
    }
  }

  function startTask() {
    if (!dbSessionId) {
      console.error('❌ Database session not created yet');
      return;
    }
    // Pass session ID to session page
    router.push(`/session?subtopic=${subtopicId}&sessionId=${dbSessionId}`);
  }

  async function handleEnvironmentSave() {
    if (!dbSessionId) {
      console.error('❌ No session ID to save environment noise');
      return;
    }

    try {
      // Convert 0-10 scale to 0-20 scale for backend storage
      const convertedEnvironmentNoise = environmentNoise * 2;
      console.log(`💾 Saving environment noise rating: ${environmentNoise} (0-10) → ${convertedEnvironmentNoise} (0-20) for session ${dbSessionId}`);
      await DatabaseClient.updateSession(dbSessionId.toString(), {
        environment_noise: convertedEnvironmentNoise
      });
      console.log('✅ Environment noise saved successfully');
      setShowEnvironmentModal(false);
    } catch (error) {
      console.error('Failed to save environment noise:', error);
      alert('Failed to save environment rating. Please try again.');
    }
  }

  // Debug function to check services status
  // const checkServicesStatus = async () => {
  //   try {
  //     const response = await fetch('/api/services/status');
  //     const data = await response.json();
  //     console.log('🔍 Services status:', data);
  //     alert(`Services Status:\nWebSocket: ${data.websocket.running ? 'Running' : 'Not Running'}\nPort: ${data.websocket.port}\nMessage: ${data.websocket.message}`);
  //   } catch (error) {
  //     console.error('Failed to check services status:', error);
  //     alert('Failed to check services status');
  //   }
  // };

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
                  {unifiedSensorStatus === 'online' && <div className="w-3 h-3 rounded-full bg-green-500" />}
                  {isChecking && unifiedSensorStatus !== 'online' && <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />}
                  {hasError && <div className="w-3 h-3 rounded-full bg-red-500" />}
                  {unifiedSensorStatus === 'offline' && !isChecking && !hasError && <div className="w-3 h-3 rounded-full bg-gray-400" />}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ESP32 sensor {unifiedSensorStatus === 'online' ? 'detected' : isChecking ? 'checking...' : hasError ? 'error' : 'not detected'}
                </span>
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
              <img
                src="http://localhost:5001/video_feed"
                alt="Webcam Feed"
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                onError={(e) => {
                  console.error('Failed to load video feed from Python backend');
                  // Hide the image on error
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {!streamStatus.webcam.active && (
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
            
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${faceDetected ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                Face: {faceDetected ? 'Detected' : 'Not detected'}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${attentionStatus === 'FOCUSED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>
                Status: {attentionStatus}
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
            
            <div className="space-y-4">
              <HRSparkline 
                sessionId={dbSessionId || 0} // Use database session ID
                isActive={calibrating || calibrationPassed}
                className="w-full"
              />
              
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {calibrationState.isActive ? 'Collecting baseline data...' :
                   calibrationState.isComplete ? 'Baseline established' :
                   calibrating ? 'Calibrating...' :
                   'Ready for calibration'}
                </div>

                {/* LED sync instruction - shown only when ready (before calibration) */}
                {!calibrating && !calibrationState.isActive && !calibrationState.isComplete && (
                  <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-purple-600 dark:text-purple-400 text-lg">💡</span>
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Instruction</span>
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1 ml-2">
                        <div className="flex gap-4">
                          <span className="font-semibold flex-shrink-0">1.</span>
                          <span>Wait for the blue LED to sync with your heartbeat</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-semibold flex-shrink-0">2.</span>
                          <span>Then click Start Calibration button</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {calibrationState.isActive && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                    Progress: {calibrationState.progress}/10 seconds
                  </div>
                )}
                {calibrating && !calibrationState.isActive && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                    {countdown} seconds remaining
                    </div>
                )}
                {calibrationPassed && rmssdBaseline && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    RMSSD Baseline: {rmssdBaseline.toFixed(1)}ms
                  </div>
                )}
                {calibrationPassed && !rmssdBaseline && (
                  <div className="text-xs text-orange-600 dark:text-orange-400">
                    RMSSD value not available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          {/* {unifiedSensorStatus === 'offline' && !isChecking && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 max-w-md">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <span className="text-lg">⚠️</span>
                <span className="text-sm font-medium">
                  {hasError ? 'Sensor connection error. Please check your ESP32 device.' : 
                   'ESP32 heart rate sensor not detected. Please ensure your ESP32 device is powered on, connected to Wi-Fi, and sending heart rate data.'}
                </span>
              </div>
            </div>
          )} */}
          
          {/* {unifiedSensorStatus === 'online' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 max-w-md">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <span className="text-lg">✅</span>
                <span className="text-sm font-medium">
                  ESP32 heart rate sensor detected and ready for calibration
                </span>
              </div>
            </div>
          )} */}
          
          {/* Debug buttons for troubleshooting */}
          {/* <div className="flex gap-4 justify-center">
            <button
              onClick={checkServicesStatus}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              🔍 Check Services Status
            </button>
          </div> */}
          
          {lastResult && !lastResult.success && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 max-w-md">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <span className="text-lg">❌</span>
                <span className="text-sm font-medium">
                  Failed to send command: {lastResult.error}
                </span>
              </div>
            </div>
          )}
          
          {!calibrationPassed ? (
            <button
              onClick={startCalibration}
              disabled={calibrating || !faceDetected || unifiedSensorStatus !== 'online' || isCommandLoading}
              className="rounded-xl px-8 py-4 btn-primary text-white font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isCommandLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sending command...
                </div>
              ) : calibrating ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Calibrating...
                </div>
              ) : (
                "Start Calibration"
              )}
            </button>
          ) : (
            <>
              {/* Environment Noise Modal */}
              {showEnvironmentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-purple-200 dark:border-purple-800">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-2xl">🔊</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Environment Assessment
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        How noisy or distracting is your current environment?
                      </p>
                    </div>

                    <div className="mb-8">
                      <div className="text-center mb-4">
                        <span className="text-4xl font-bold gradient-text">
                          {environmentNoise}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">/ 10</span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={environmentNoise}
                        onChange={(e) => setEnvironmentNoise(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
                      />

                      {/* Scale markers */}
                      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
                        <span>0</span>
                        <span>2</span>
                        <span>4</span>
                        <span>6</span>
                        <span>8</span>
                        <span>10</span>
                      </div>

                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <span>Very Quiet</span>
                        <span>Very Noisy</span>
                      </div>
                    </div>

                    <button
                      onClick={handleEnvironmentSave}
                      className="w-full rounded-xl px-6 py-3 btn-primary text-white font-semibold transition-all duration-300"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}

              {/* Calibration Complete Screen (shown after modal closes) */}
              <div className="text-center space-y-6">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-green-200 dark:border-green-800 shadow-lg">
                  <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">Calibration Complete!</h3>
                  <p className="text-green-700 dark:text-green-300 text-sm mb-2">Your devices are ready for monitoring</p>
                  {/* {rmssdBaseline && (
                    <p className="text-green-600 dark:text-green-400 text-xs">
                      RMSSD Baseline: {rmssdBaseline.toFixed(1)}ms
                    </p>
                  )} */}
                </div>
                <button
                  onClick={startTask}
                  className="rounded-xl px-8 py-4 btn-primary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Start Task
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

