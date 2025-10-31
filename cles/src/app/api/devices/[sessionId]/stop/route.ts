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
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const client = getMQTTClient();
    const topic = `cles/hr/${sessionId}/ctrl`;
    
    // Send stop command to ESP32
    const message = JSON.stringify({
      cmd: 'stop',
      sessionId: sessionId,
      timestamp: Date.now()
    });

    client.publish(topic, message, { qos: 1 }, (error) => {
      if (error) {
        console.error('Failed to publish MQTT stop command:', error);
      } else {
        console.log(`🛑 Sent stop command to session ${sessionId}`);
      }
    });

    return NextResponse.json({
      success: true,
      command: 'stop',
      sessionId,
      topic,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error sending MQTT stop command:', error);
    return NextResponse.json(
      { error: 'Failed to send stop command to device' },
      { status: 500 }
    );
  }
}
