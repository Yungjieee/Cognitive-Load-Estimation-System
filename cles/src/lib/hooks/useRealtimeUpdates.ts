import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketMessage {
  type: 'calibration_progress' | 'calibration_complete' | 'sensor_status' | 'hr_update' | 'sensor_heartbeat';
  sessionId?: number;
  progress?: number;
  rmssdBase?: number;
  status?: 'online' | 'offline';
  bpm?: number;
  timestamp: number;
}

interface CalibrationState {
  isActive: boolean;
  progress: number;
  rmssdBase: number | null;
  isComplete: boolean;
}

export function useRealtimeUpdates(sessionId?: number) {
  const [isConnected, setIsConnected] = useState(false);
  const [calibrationState, setCalibrationState] = useState<CalibrationState>({
    isActive: false,
    progress: 0,
    rmssdBase: null,
    isComplete: false
  });
  const [currentBPM, setCurrentBPM] = useState<number | null>(null);
  const [sensorStatus, setSensorStatus] = useState<'online' | 'offline'>('offline');
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<number>(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Add a small delay to ensure WebSocket server is ready
      setTimeout(() => {
        const ws = new WebSocket('ws://localhost:8080');
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('🔌 WebSocket connected');
          setIsConnected(true);
          // Don't automatically set sensor status to online - wait for actual sensor data
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            
            switch (message.type) {
              case 'calibration_progress':
                if (!sessionId || message.sessionId === sessionId) {
                  setCalibrationState(prev => ({
                    ...prev,
                    isActive: true,
                    progress: message.progress || 0,
                    isComplete: false
                  }));
                }
                break;
                
              case 'calibration_complete':
                if (!sessionId || message.sessionId === sessionId) {
                  setCalibrationState(prev => ({
                    ...prev,
                    isActive: false,
                    progress: 10,
                    rmssdBase: message.rmssdBase || null,
                    isComplete: true
                  }));
                }
                break;
                
              case 'sensor_status':
                const newStatus = message.status || 'offline';
                setSensorStatus(newStatus);
                if (newStatus === 'online') {
                  setLastHeartbeatTime(Date.now());
                }
                break;
                
              case 'hr_update':
                if (!sessionId || message.sessionId === sessionId) {
                  setCurrentBPM(message.bpm || null);
                  // HR data indicates sensor is online
                  setSensorStatus('online');
                  setLastHeartbeatTime(Date.now());
                }
                break;
                
              case 'sensor_heartbeat':
                // Explicit sensor heartbeat
                setSensorStatus('online');
                setLastHeartbeatTime(Date.now());
                break;
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          setIsConnected(false);
          setSensorStatus('offline');
          
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          console.log('💡 Make sure the WebSocket server is running on port 8080');
          setIsConnected(false);
          setSensorStatus('offline');
        };
      }, 1000); // 1 second delay

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setIsConnected(false);
      setSensorStatus('offline');
    }
  }, [sessionId]);

  // Monitor heartbeat - if no signal for 20 seconds, mark as offline
  useEffect(() => {
    // Clear existing timeout
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    // Set new timeout if we have a heartbeat
    if (lastHeartbeatTime > 0) {
      heartbeatTimeoutRef.current = setTimeout(() => {
        console.log('⚠️ No heartbeat received for 20s - marking sensor as offline');
        setSensorStatus('offline');
      }, 20000); // 20 seconds timeout (ESP32 sends every 10s)
    }

    return () => {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
    };
  }, [lastHeartbeatTime]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setSensorStatus('offline');
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const resetCalibration = useCallback(() => {
    setCalibrationState({
      isActive: false,
      progress: 0,
      rmssdBase: null,
      isComplete: false
    });
  }, []);

  return {
    isConnected,
    calibrationState,
    currentBPM,
    sensorStatus,
    resetCalibration
  };
}
