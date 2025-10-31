// MQTT receiver for CLES heart rate data
// SIMPLIFIED: Handles real-time HR data from ESP32 via MQTT with direct Supabase storage

import mqtt from 'mqtt';
import { DatabaseClient } from './database';
import { handleCalibrationComplete, handleSensorStatus, handleHRUpdate } from './websocket';

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';

let client: mqtt.MqttClient | null = null;
let lastSensorStatus: 'online' | 'offline' | null = null;
const sessionBeatCounters = new Map<number, number>();

// Track ESP32 device heartbeat (session-independent)
let lastHeartbeatTimestamp: number = 0;
let lastHeartbeatDeviceId: string | null = null;

// Guard to prevent multiple handler registrations
let messageHandlerRegistered = false;

export function startMQTTReceiver() {
  if (client && messageHandlerRegistered) {
    console.log('⚠️ MQTT receiver already started and handler registered');
    return;
  }

  if (client && !messageHandlerRegistered) {
    console.log('⚠️ MQTT client exists but handler not registered - cleaning up old client');
    client.end();
    client = null;
  }

  console.log(`🔌 [MQTT] Connecting to MQTT broker: ${MQTT_BROKER}`);
  client = mqtt.connect(MQTT_BROKER);

  client.on('connect', () => {
    console.log('✅ [MQTT] Connected to broker');

    // Subscribe to all needed topics (including global heartbeat)
    client!.subscribe(['cles/hr/+/beat', 'cles/hr/+/ui/sec', 'cles/hr/+/ctrl', 'cles/hr/status', 'cles/hr/heartbeat'], (err: Error | null) => {
      if (err) {
        console.error('❌ [MQTT] Subscription failed:', err);
      } else {
        console.log(`📡 [MQTT] Subscribed to topics (including heartbeat)`);
      }
    });
  });

  // CRITICAL: Only register message handler once to prevent duplicate beat storage
  if (messageHandlerRegistered) {
    console.log('⚠️ [MQTT] Message handler already registered, skipping...');
    return;
  }

  console.log('📝 [MQTT] Registering message handler...');
  messageHandlerRegistered = true;

  client.on('message', async (topic: string, message: Buffer) => {
    // Handle global heartbeat: "cles/hr/heartbeat"
    if (topic === 'cles/hr/heartbeat') {
      try {
        const data = JSON.parse(message.toString());
        const { deviceId, status, timestamp } = data;

        if (deviceId && status === 'online') {
          lastHeartbeatTimestamp = Date.now();
          lastHeartbeatDeviceId = deviceId;

          // Broadcast sensor online status via WebSocket
          handleSensorStatus('online');

          // Log heartbeat (less verbose)
          console.log(`💚 Heartbeat received from ${deviceId} at ${new Date().toLocaleTimeString()}`);
        }
      } catch (error) {
        console.error('❌ Error processing heartbeat:', error);
      }
    }

    // Handle heartbeat data: "cles/hr/<sessionId>/beat"
    else if (topic.match(/^cles\/hr\/\d+\/beat$/)) {
      try {
        const data = JSON.parse(message.toString());
        const { sessionId, ts, ibi_ms, bpm } = data;

        // Validate required fields
        if (!sessionId || ts === undefined || !ibi_ms || !bpm) {
          console.error('❌ [MQTT] Invalid HR data received:', data);
          return;
        }

        // Track beat counter per session BEFORE insertion
        if (!sessionBeatCounters.has(sessionId)) {
          sessionBeatCounters.set(sessionId, 0);
        }
        const beatNumber = sessionBeatCounters.get(sessionId)! + 1;
        sessionBeatCounters.set(sessionId, beatNumber);

        console.log(`💓 [MQTT] Processing beat #${beatNumber}: Session ${sessionId}, ts=${ts}ms, BPM ${bpm}, IBI ${ibi_ms}ms`);

        // DIRECT INSERT TO SUPABASE - NO IN-MEMORY STORAGE
        await DatabaseClient.createHRBeat({
          session_id: String(sessionId),
          ts_ms: ts,
          ibi_ms: ibi_ms,
          bpm: bpm
        });

        // Send to WebSocket for live UI updates
        handleHRUpdate(sessionId, bpm);
        handleSensorStatus('online');

        console.log(`✅ [MQTT] Beat #${beatNumber} saved to database`);
      } catch (error) {
        console.error('❌ [MQTT] Error processing HR data:', error);
      }
    }
    
    // Handle UI summary: "cles/hr/<sessionId>/ui/sec"
    else if (topic.match(/^cles\/hr\/\d+\/ui\/sec$/)) {
      try {
        const data = JSON.parse(message.toString());
        const { sessionId, bpm } = data;
        
        // Just broadcast to WebSocket for live UI
        handleHRUpdate(sessionId, bpm);
        handleSensorStatus('online');
      } catch (error) {
        console.error('❌ Error processing UI summary:', error);
      }
    }
    
    // Handle control messages: "cles/hr/<sessionId>/ctrl"
    else if (topic.match(/^cles\/hr\/\d+\/ctrl$/)) {
      try {
        const data = JSON.parse(message.toString());
        
        // Calibration complete
        if (data.phase === 'calibration_done') {
          console.log(`✅ Calibration complete! Broadcasting to WebSocket...`);
          const sessionId = parseInt(topic.split('/')[2]);
          handleCalibrationComplete(sessionId, 0);
        }
        
        // Session control commands
        else if (data.cmd) {
          const { cmd, sessionId } = data;
          if (cmd === 'calibrate') {
            console.log(`🔧 Calibration started for session: ${sessionId}`);
            sessionBeatCounters.set(sessionId, 0); // Reset counter
          }
        }
      } catch (error) {
        console.error('❌ Error processing control message:', error);
      }
    }
    
    // Handle sensor status: "cles/hr/status"
    else if (topic === 'cles/hr/status') {
      try {
        const data = JSON.parse(message.toString());
        if (data.phase === 'sensor_offline' && lastSensorStatus !== 'offline') {
          console.log('⚠️ Sensor offline');
          lastSensorStatus = 'offline';
          handleSensorStatus('offline');
        } else if (data.phase === 'sensor_online' && lastSensorStatus !== 'online') {
          console.log('✅ Sensor online');
          lastSensorStatus = 'online';
          handleSensorStatus('online');
        }
      } catch (error) {
        console.error('❌ Error processing status message:', error);
      }
    }
  });
  
  client.on('error', (error: Error) => {
    console.error('❌ MQTT error:', error);
  });
  
  client.on('close', () => {
    console.log('🔌 MQTT connection closed');
  });
  
  client.on('offline', () => {
    console.log('📴 MQTT offline');
  });
}

export function stopMQTTReceiver() {
  if (client) {
    console.log('🛑 Stopping MQTT receiver');
    client.end();
    client = null;
    messageHandlerRegistered = false; // Reset the flag
  }
}

export function isMQTTConnected(): boolean {
  return client ? client.connected : false;
}

/**
 * Check if ESP32 device is online based on recent heartbeat
 * Returns true if heartbeat received within last 15 seconds (3x heartbeat interval)
 */
export function isESP32Online(): boolean {
  if (lastHeartbeatTimestamp === 0) {
    return false; // No heartbeat received yet
  }

  const HEARTBEAT_TIMEOUT = 15000; // 15 seconds (3x the 5-second interval)
  const timeSinceLastHeartbeat = Date.now() - lastHeartbeatTimestamp;

  return timeSinceLastHeartbeat < HEARTBEAT_TIMEOUT;
}

/**
 * Get last heartbeat information for debugging
 */
export function getLastHeartbeatInfo(): { timestamp: number; deviceId: string | null; isOnline: boolean } {
  return {
    timestamp: lastHeartbeatTimestamp,
    deviceId: lastHeartbeatDeviceId,
    isOnline: isESP32Online()
  };
}

// Note: MQTT receiver must be explicitly started via API route
// This prevents auto-start which can cause issues in Next.js

