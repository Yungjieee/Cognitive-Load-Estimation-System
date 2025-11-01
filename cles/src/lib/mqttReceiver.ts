// MQTT receiver for CLES heart rate data
// SIMPLIFIED: Handles real-time HR data from ESP32 via MQTT with direct Supabase storage

import mqtt from 'mqtt';
import { DatabaseClient } from './database';
import { handleCalibrationComplete, handleSensorStatus, handleHRUpdate } from './websocket';

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';

// ============================================================================
// GLOBAL SINGLETON PATTERN - Survives Next.js Hot Module Reloading
// ============================================================================
// Use Node.js global object to store state across module reloads
// This ensures only ONE MQTT receiver instance exists even when Next.js reloads modules

interface GlobalMQTTState {
  client: mqtt.MqttClient | null;
  lastSensorStatus: 'online' | 'offline' | null;
  sessionBeatCounters: Map<number, number>;
  lastHeartbeatTimestamp: number;
  lastHeartbeatDeviceId: string | null;
  sessionQuestionIndex: Map<number, number>;
  messageHandlerRegistered: boolean;
  instanceId: string;
}

declare global {
  var __CLES_MQTT_STATE__: GlobalMQTTState | undefined;
}

// Initialize global state if it doesn't exist
if (!global.__CLES_MQTT_STATE__) {
  global.__CLES_MQTT_STATE__ = {
    client: null,
    lastSensorStatus: null,
    sessionBeatCounters: new Map<number, number>(),
    lastHeartbeatTimestamp: 0,
    lastHeartbeatDeviceId: null,
    sessionQuestionIndex: new Map<number, number>(),
    messageHandlerRegistered: false,
    instanceId: Math.random().toString(36).substring(7)
  };
  console.log(`🔧 [MQTT] Global singleton state initialized: ${global.__CLES_MQTT_STATE__.instanceId}`);
}

// Use the global singleton state
const mqttState = global.__CLES_MQTT_STATE__;

export function startMQTTReceiver() {
  if (mqttState.client && mqttState.messageHandlerRegistered) {
    console.log(`⚠️ [MQTT-${mqttState.instanceId}] MQTT receiver already started and handler registered`);
    return;
  }

  if (mqttState.client && !mqttState.messageHandlerRegistered) {
    console.log(`⚠️ [MQTT-${mqttState.instanceId}] MQTT client exists but handler not registered - cleaning up old client`);
    mqttState.client.end();
    mqttState.client = null;
  }

  console.log(`🔌 [MQTT-${mqttState.instanceId}] Connecting to MQTT broker: ${MQTT_BROKER}`);
  mqttState.client = mqtt.connect(MQTT_BROKER);

  mqttState.client.on('connect', () => {
    console.log(`✅ [MQTT-${mqttState.instanceId}] Connected to broker`);

    // Subscribe to all needed topics (including global heartbeat)
    mqttState.client!.subscribe(['cles/hr/+/beat', 'cles/hr/+/ui/sec', 'cles/hr/+/ctrl', 'cles/hr/status', 'cles/hr/heartbeat'], (err: Error | null) => {
      if (err) {
        console.error('❌ [MQTT] Subscription failed:', err);
      } else {
        console.log(`📡 [MQTT-${mqttState.instanceId}] Subscribed to topics (including heartbeat)`);
      }
    });
  });

  // CRITICAL: Only register message handler once to prevent duplicate beat storage
  if (mqttState.messageHandlerRegistered) {
    console.log(`⚠️ [MQTT-${mqttState.instanceId}] Message handler already registered, skipping...`);
    return;
  }

  console.log(`📝 [MQTT-${mqttState.instanceId}] Registering message handler...`);
  mqttState.messageHandlerRegistered = true;

  mqttState.client.on('message', async (topic: string, message: Buffer) => {
    // Handle global heartbeat: "cles/hr/heartbeat"
    if (topic === 'cles/hr/heartbeat') {
      try {
        const data = JSON.parse(message.toString());
        const { deviceId, status, timestamp } = data;

        if (deviceId && status === 'online') {
          mqttState.lastHeartbeatTimestamp = Date.now();
          mqttState.lastHeartbeatDeviceId = deviceId;

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
        if (!mqttState.sessionBeatCounters.has(sessionId)) {
          mqttState.sessionBeatCounters.set(sessionId, 0);
        }
        const beatNumber = mqttState.sessionBeatCounters.get(sessionId)! + 1;
        mqttState.sessionBeatCounters.set(sessionId, beatNumber);

        // Get q_label from Map (simple backend variable)
        const qIndex = mqttState.sessionQuestionIndex.get(sessionId) ?? 0;
        const q_label = `q${qIndex}`;
        console.log(`💓 [MQTT-${mqttState.instanceId}] Processing beat #${beatNumber}: Session ${sessionId}, ts=${ts}ms, BPM ${bpm}, IBI ${ibi_ms}ms, q_label=${q_label} (index: ${qIndex})`);

        // DIRECT INSERT TO SUPABASE - NO IN-MEMORY STORAGE
        await DatabaseClient.createHRBeat({
          session_id: String(sessionId),
          ts_ms: ts,
          ibi_ms: ibi_ms,
          bpm: bpm,
          q_label: q_label
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
            mqttState.sessionBeatCounters.set(sessionId, 0); // Reset counter
            mqttState.sessionQuestionIndex.set(sessionId, 0); // Set to calibration (q0)
            console.log(`📝 [MQTT-${mqttState.instanceId}] Session ${sessionId} set to q0 (calibration)`);
          }
          else if (cmd === 'set_question') {
            const { q_label } = data;
            // Extract index from q_label (e.g., "q1" -> 1, "q2" -> 2)
            const qIndex = parseInt(q_label.substring(1));
            mqttState.sessionQuestionIndex.set(sessionId, qIndex);
            console.log(`📝 [MQTT-${mqttState.instanceId}] Session ${sessionId} question set to: ${q_label} (index: ${qIndex})`);
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
        if (data.phase === 'sensor_offline' && mqttState.lastSensorStatus !== 'offline') {
          console.log('⚠️ Sensor offline');
          mqttState.lastSensorStatus = 'offline';
          handleSensorStatus('offline');
        } else if (data.phase === 'sensor_online' && mqttState.lastSensorStatus !== 'online') {
          console.log('✅ Sensor online');
          mqttState.lastSensorStatus = 'online';
          handleSensorStatus('online');
        }
      } catch (error) {
        console.error('❌ Error processing status message:', error);
      }
    }
  });

  mqttState.client.on('error', (error: Error) => {
    console.error('❌ MQTT error:', error);
  });

  mqttState.client.on('close', () => {
    console.log('🔌 MQTT connection closed');
  });

  mqttState.client.on('offline', () => {
    console.log('📴 MQTT offline');
  });
}

export function stopMQTTReceiver() {
  if (mqttState.client) {
    console.log('🛑 Stopping MQTT receiver');
    mqttState.client.end();
    mqttState.client = null;
    mqttState.messageHandlerRegistered = false; // Reset the flag
  }
}

export function isMQTTConnected(): boolean {
  return mqttState.client ? mqttState.client.connected : false;
}

/**
 * Set the current question for a session (for q_label tagging)
 * All beats arriving after this call will be tagged with the specified q_label
 * @param sessionId - The session ID
 * @param q_label - The question label (q0-q5)
 * @param timestamp - Session-relative timestamp in ms (kept for API compatibility but not used for tagging)
 */
export function setSessionQuestion(sessionId: number, q_label: string, timestamp: number): void {
  // Extract index from q_label (e.g., "q1" -> 1, "q2" -> 2)
  const qIndex = parseInt(q_label.substring(1));

  console.log(`🔧 [MQTT-${mqttState.instanceId}] setSessionQuestion called: session=${sessionId}, q_label=${q_label}, index=${qIndex}`);

  // Update the GLOBAL Map (survives Next.js hot reloading)
  mqttState.sessionQuestionIndex.set(sessionId, qIndex);

  console.log(`✅ [MQTT-${mqttState.instanceId}] Updated GLOBAL Map: session ${sessionId} index = ${qIndex}`);
  console.log(`📝 [MQTT-${mqttState.instanceId}] Set session ${sessionId} to ${q_label} (index: ${qIndex})`);
  console.log(`✅ [MQTT-${mqttState.instanceId}] All beats from now on will be tagged as ${q_label}`);

  // Optionally publish to MQTT for ESP32 awareness (if needed)
  if (mqttState.client && mqttState.client.connected) {
    mqttState.client.publish(`cles/hr/${sessionId}/ctrl`, JSON.stringify({
      cmd: 'set_question',
      sessionId,
      q_label,
      timestamp
    }));
  }
}

/**
 * Check if ESP32 device is online based on recent heartbeat
 * Returns true if heartbeat received within last 15 seconds (3x heartbeat interval)
 */
export function isESP32Online(): boolean {
  if (mqttState.lastHeartbeatTimestamp === 0) {
    return false; // No heartbeat received yet
  }

  const HEARTBEAT_TIMEOUT = 15000; // 15 seconds (3x the 5-second interval)
  const timeSinceLastHeartbeat = Date.now() - mqttState.lastHeartbeatTimestamp;

  return timeSinceLastHeartbeat < HEARTBEAT_TIMEOUT;
}

/**
 * Get last heartbeat information for debugging
 */
export function getLastHeartbeatInfo(): { timestamp: number; deviceId: string | null; isOnline: boolean } {
  return {
    timestamp: mqttState.lastHeartbeatTimestamp,
    deviceId: mqttState.lastHeartbeatDeviceId,
    isOnline: isESP32Online()
  };
}

// Note: MQTT receiver must be explicitly started via API route
// This prevents auto-start which can cause issues in Next.js

