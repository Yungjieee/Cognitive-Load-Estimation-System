import { NextResponse } from 'next/server';
import { isWebSocketServerRunning } from '@/lib/websocket';

export async function GET() {
  try {
    // Check if WebSocket server is running
    const wsRunning = isWebSocketServerRunning();
    
    return NextResponse.json({
      websocket: {
        running: wsRunning,
        port: 8080,
        message: wsRunning ? 'WebSocket server is running' : 'WebSocket server is not running'
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        websocket: {
          running: false,
          port: 8080,
          error: 'Failed to check WebSocket status'
        },
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}
