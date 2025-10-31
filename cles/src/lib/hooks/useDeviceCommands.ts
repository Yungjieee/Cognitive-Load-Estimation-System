import { useState, useCallback } from 'react';

interface DeviceCommandResult {
  success: boolean;
  error?: string;
  timestamp: number;
}

export function useDeviceCommands() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<DeviceCommandResult | null>(null);

  const sendCommand = useCallback(async (sessionId: number, command: 'start' | 'stop' | 'calibrate'): Promise<DeviceCommandResult> => {
    setIsLoading(true);
    setLastResult(null);

    try {
      const endpoint = command === 'start' 
        ? `/api/devices/${sessionId}/start`
        : command === 'stop'
        ? `/api/devices/${sessionId}/stop`
        : `/api/devices/${sessionId}/calibrate`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, command }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Command failed');
      }

      const result: DeviceCommandResult = {
        success: true,
        timestamp: data.timestamp
      };

      setLastResult(result);
      return result;

    } catch (error) {
      const result: DeviceCommandResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };

      setLastResult(result);
      return result;

    } finally {
      setIsLoading(false);
    }
  }, []);

  const startCalibration = useCallback(async (sessionId: number) => {
    // First send 'start' to begin the session, then 'calibrate' to start calibration
    const startResult = await sendCommand(sessionId, 'start');
    if (startResult.success) {
      // Small delay to ensure ESP32 has started the session
      await new Promise(resolve => setTimeout(resolve, 100));
      // Now send calibrate command
      return await sendCommand(sessionId, 'calibrate');
    }
    return startResult;
  }, [sendCommand]);

  const stopSession = useCallback(async (sessionId: number) => {
    return sendCommand(sessionId, 'stop');
  }, [sendCommand]);

  return {
    isLoading,
    lastResult,
    sendCommand,
    startCalibration,
    stopSession
  };
}
