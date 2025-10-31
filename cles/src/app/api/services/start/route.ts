import { NextRequest, NextResponse } from 'next/server';
import { isWebSocketServerRunning } from '@/lib/websocket';

let servicesInitialized = false;

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Services start API called');

    // Services are automatically initialized via instrumentation.ts
    // This endpoint just checks if they are running
    const wsRunning = isWebSocketServerRunning();

    if (!servicesInitialized) {
      servicesInitialized = true; // Mark as initialized on first call
    }

    console.log('ℹ️ Services status check - initialized via instrumentation.ts');

    return NextResponse.json({
      success: true,
      message: 'Services initialized via instrumentation.ts',
      websocket: {
        running: wsRunning,
        port: 8080
      },
      note: 'MQTT and WebSocket are automatically initialized on server start',
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ Failed to check services:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check services status',
        websocket: {
          running: false,
          port: 8080
        },
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    initialized: servicesInitialized,
    timestamp: Date.now()
  });
}
