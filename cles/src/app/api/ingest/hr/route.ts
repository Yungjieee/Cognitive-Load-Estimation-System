//Legacy HR ingestion route - DISABLED (now using MQTT)
// This route was causing duplicate beat storage because ESP32 was sending data via both HTTP and MQTT

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.warn('⚠️ [HTTP] Legacy /api/ingest/hr endpoint called - THIS ROUTE IS DISABLED');
  console.warn('⚠️ [HTTP] Please use MQTT for heart rate data ingestion');
  console.warn('⚠️ [HTTP] Update your ESP32 firmware to remove HTTP POST requests');

  const body = await request.json();
  console.warn('⚠️ [HTTP] Received data (NOT storing):', body);

  return NextResponse.json({
    success: false,
    error: 'This endpoint is disabled. Use MQTT instead.',
    message: 'The HTTP ingestion route has been replaced by MQTT. Please update your ESP32 firmware.'
  }, { status: 410 }); // 410 Gone - indicates this endpoint is permanently disabled
}
