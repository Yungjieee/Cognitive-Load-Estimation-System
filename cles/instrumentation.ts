// instrumentation.ts
// This file runs automatically when the Next.js server starts
// Use it to initialize global services like MQTT receiver

export async function register() {
  console.log('🔧 Instrumentation hook registered');
  // Only run in Node.js environment (server-side)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 CLES Server Starting...');
    
    try {
      console.log('📡 Initializing MQTT receiver...');
      // Import and start MQTT receiver
      const { startMQTTReceiver } = await import('./src/lib/mqttReceiver');
      startMQTTReceiver();
      console.log('✅ MQTT receiver started');
      
      console.log('🔌 Initializing WebSocket server...');
      // Import and start WebSocket server
      const { initializeWebSocketServer } = await import('./src/lib/websocket');
      const wsServer = initializeWebSocketServer();
      
      if (wsServer) {
        console.log('✅ WebSocket server started successfully');
      } else {
        console.error('❌ Failed to start WebSocket server');
      }
      
    } catch (error) {
      console.error('❌ Error during service initialization:', error);
    }
  }
}

