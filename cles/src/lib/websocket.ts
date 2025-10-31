import { WebSocketServer } from 'ws';

// WebSocket server for real-time communication
let wss: WebSocketServer | null = null;
const clients = new Set<any>();

export function initializeWebSocketServer() {
  if (wss) return wss;

  try {
    wss = new WebSocketServer({ port: 8080 });
    
    wss.on('connection', (ws) => {
      console.log('🔌 New WebSocket client connected');
      clients.add(ws);
      
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        clients.delete(ws);
      });
    });

    wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
      if (error.message.includes('EADDRINUSE')) {
        console.log('💡 Port 8080 is already in use. WebSocket server may already be running.');
      }
    });

    console.log('🚀 WebSocket server started on port 8080');
    return wss;
  } catch (error) {
    console.error('❌ Failed to start WebSocket server:', error);
    return null;
  }
}

// Broadcast message to all connected clients
export function broadcastToClients(message: any) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
    }
  });
}

// Handle calibration progress updates
export function handleCalibrationProgress(sessionId: number, progress: number) {
  broadcastToClients({
    type: 'calibration_progress',
    sessionId,
    progress,
    timestamp: Date.now()
  });
}

// Handle calibration completion
export function handleCalibrationComplete(sessionId: number, rmssdBase: number) {
  broadcastToClients({
    type: 'calibration_complete',
    sessionId,
    rmssdBase,
    timestamp: Date.now()
  });
}

// Handle sensor status updates
export function handleSensorStatus(status: 'online' | 'offline') {
  broadcastToClients({
    type: 'sensor_status',
    status,
    timestamp: Date.now()
  });
}

// Handle HR data updates
export function handleHRUpdate(sessionId: number, bpm: number) {
  broadcastToClients({
    type: 'hr_update',
    sessionId,
    bpm,
    timestamp: Date.now()
  });
}

// Check if WebSocket server is running
export function isWebSocketServerRunning(): boolean {
  return wss !== null;
}

// Get WebSocket server instance
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}
