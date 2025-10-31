//Check HRV system status

import { NextResponse } from 'next/server';
import { isMQTTConnected } from '@/lib/mqttReceiver';

export async function GET() {
  try {
    const mqttConnected = isMQTTConnected();
    
    return NextResponse.json({
      status: mqttConnected ? 'active' : 'inactive',
      message: mqttConnected ? 'HRV system is running' : 'MQTT not connected',
      mqttConnected
    });
  } catch (error) {
    console.error('Error getting HRV status:', error);
    return NextResponse.json(
      { error: 'Failed to get HRV status' },
      { status: 500 }
    );
  }
}

