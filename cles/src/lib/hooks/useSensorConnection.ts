import { useState, useEffect, useCallback } from 'react';

interface SensorStatus {
  connected: boolean;
  status: 'online' | 'offline' | 'error' | 'checking';
  lastChecked: number;
  error?: string;
}

export function useSensorConnection() {
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>({
    connected: false,
    status: 'checking',
    lastChecked: 0
  });

  const checkConnection = useCallback(async () => {
    try {
      setSensorStatus(prev => ({ ...prev, status: 'checking' }));
      
      const response = await fetch('/api/mqtt/status');
      const data = await response.json();
      
      setSensorStatus({
        connected: data.connected,
        status: data.status,
        lastChecked: data.timestamp,
        error: data.error
      });
    } catch (error) {
      console.error('Failed to check sensor connection:', error);
      setSensorStatus({
        connected: false,
        status: 'error',
        lastChecked: Date.now(),
        error: 'Failed to connect to sensor service'
      });
    }
  }, []);

  // Check connection on mount and every 5 seconds
  useEffect(() => {
    checkConnection();
    
    const interval = setInterval(checkConnection, 5000);
    
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    sensorStatus,
    checkConnection,
    isConnected: sensorStatus.connected,
    isOnline: sensorStatus.status === 'online',
    isChecking: sensorStatus.status === 'checking',
    hasError: sensorStatus.status === 'error'
  };
}
