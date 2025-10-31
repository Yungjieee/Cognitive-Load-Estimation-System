// API route to check MQTT receiver status AND ESP32 device heartbeat
import { isMQTTConnected, isESP32Online, getLastHeartbeatInfo } from '@/lib/mqttReceiver';
import { NextResponse } from 'next/server';

export async function GET() {
  const mqttConnected = isMQTTConnected();
  const esp32Online = isESP32Online();
  const heartbeatInfo = getLastHeartbeatInfo();

  // Consider the sensor "connected" only if:
  // 1. MQTT broker is connected AND
  // 2. ESP32 heartbeat received within last 15 seconds
  const connected = mqttConnected && esp32Online;

  // Determine status
  let status: 'online' | 'offline' | 'checking';
  if (!mqttConnected) {
    status = 'checking'; // MQTT broker not connected yet
  } else if (esp32Online) {
    status = 'online'; // Both MQTT and ESP32 are online
  } else {
    status = 'offline'; // MQTT connected but no ESP32 heartbeat
  }

  return NextResponse.json({
    connected,
    status,
    mqttConnected,
    esp32Online,
    lastHeartbeat: heartbeatInfo.timestamp,
    deviceId: heartbeatInfo.deviceId,
    timestamp: Date.now(),
    message: connected
      ? 'ESP32 sensor detected and ready'
      : mqttConnected
        ? 'MQTT connected, waiting for ESP32 heartbeat...'
        : 'MQTT receiver initializing...'
  });
}
