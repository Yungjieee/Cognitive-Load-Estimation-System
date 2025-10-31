import { NextRequest, NextResponse } from 'next/server';
import mqtt from 'mqtt';

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';

let mqttClient: mqtt.MqttClient | null = null;

// Initialize MQTT client for sending commands
function getMQTTClient(): mqtt.MqttClient {
  if (!mqttClient) {
    mqttClient = mqtt.connect(MQTT_BROKER);
  }
  return mqttClient;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, command } = await request.json();
    
    if (!sessionId || !command) {
      return NextResponse.json(
        { error: 'Missing sessionId or command' },
        { status: 400 }
      );
    }

    const client = getMQTTClient();
    const topic = `cles/hr/${sessionId}/ctrl`;
    
    // Send command to ESP32
    const message = JSON.stringify({
      cmd: command,
      sessionId: sessionId,
      timestamp: Date.now()
    });

    client.publish(topic, message, { qos: 1 }, (error) => {
      if (error) {
        console.error('Failed to publish MQTT command:', error);
      } else {
        console.log(`📡 Sent ${command} command to session ${sessionId}`);
      }
    });

    return NextResponse.json({
      success: true,
      command,
      sessionId,
      topic,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error sending MQTT command:', error);
    return NextResponse.json(
      { error: 'Failed to send command to device' },
      { status: 500 }
    );
  }
}

