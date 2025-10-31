# CLES System Diagnostic and Fix Script
# Run this to test and fix MQTT connection issues

Write-Host "`n=== CLES System Diagnostic ===" -ForegroundColor Cyan
Write-Host "Testing your MQTT and ESP32 connection...`n" -ForegroundColor Cyan

# Step 1: Check if Next.js is running
Write-Host "[1/5] Checking Next.js server..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Next.js is running on http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Next.js is NOT running!" -ForegroundColor Red
    Write-Host "   Please run: cd cles && npm run dev" -ForegroundColor Yellow
    exit
}

# Step 2: Check current service status
Write-Host "`n[2/5] Checking service status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "http://localhost:3000/api/services/start" -Method GET
    Write-Host "   Current status: initialized = $($status.initialized)" -ForegroundColor White
} catch {
    Write-Host "⚠️ Could not check status" -ForegroundColor Yellow
}

# Step 3: Start MQTT receiver and WebSocket server
Write-Host "`n[3/5] Starting MQTT receiver and WebSocket server..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/services/start"
    
    if ($result.success) {
        Write-Host "✅ Services started successfully!" -ForegroundColor Green
        Write-Host "   - MQTT Receiver: Running" -ForegroundColor Green
        Write-Host "   - WebSocket Server: Running on port $($result.websocket.port)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start services" -ForegroundColor Red
        Write-Host "   Error: $($result.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error starting services: $_" -ForegroundColor Red
    Write-Host "   Check your Next.js console for error details" -ForegroundColor Yellow
}

# Step 4: Check MQTT status
Write-Host "`n[4/5] Checking MQTT connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 2  # Give MQTT time to connect

try {
    $mqttStatus = Invoke-RestMethod -Uri "http://localhost:3000/api/mqtt/status"
    
    if ($mqttStatus.mqttConnected) {
        Write-Host "✅ MQTT is connected!" -ForegroundColor Green
    } else {
        Write-Host "❌ MQTT is NOT connected" -ForegroundColor Red
        Write-Host "   Make sure MQTT broker (mosquitto) is running:" -ForegroundColor Yellow
        Write-Host "   mosquitto -v" -ForegroundColor White
    }
} catch {
    Write-Host "⚠️ Could not check MQTT status" -ForegroundColor Yellow
}

# Step 5: Show your computer's IP address
Write-Host "`n[5/5] Your computer's IP addresses:" -ForegroundColor Yellow
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" }
foreach ($ip in $ipAddresses) {
    Write-Host "   - $($ip.IPAddress) ($($ip.InterfaceAlias))" -ForegroundColor White
}

# Final instructions
Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Make sure your ESP32 code has the correct MQTT server IP" -ForegroundColor White
Write-Host "   const char* mqtt_server = `"YOUR_IP_HERE`";  // Use IP from above" -ForegroundColor Gray
Write-Host "`n2. Upload code to ESP32 and check Serial Monitor (115200 baud)" -ForegroundColor White
Write-Host "   You should see: 'MQTT connected!'" -ForegroundColor Gray
Write-Host "`n3. Open calibration page:" -ForegroundColor White
Write-Host "   http://localhost:3000/calibration?subtopic=arrays" -ForegroundColor Cyan
Write-Host "`n4. Check if sensor status shows 'Online' (green)" -ForegroundColor White
Write-Host "`n=== Diagnostic Complete ===" -ForegroundColor Cyan


