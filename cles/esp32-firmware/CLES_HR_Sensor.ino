/*
 * CLES Heart Rate Sensor Firmware
 * ESP32 + SEN-11574 Pulse Sensor
 * 
 * Features:
 * - PPG signal processing with peak detection
 * - IBI (Inter-Beat Interval) calculation
 * - BPM computation
 * - WiFi connectivity to CLES backend
 * - Automatic reconnection handling
 * - Real-time data transmission
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// CLES Backend Configuration
const char* serverURL = "http://YOUR_LOCAL_IP:3000/api/ingest/hr";
// Example: "http://192.168.1.100:3000/api/ingest/hr"

// Hardware Configuration
const int PULSE_PIN = 34;  // ADC pin for SEN-11574 signal
const int LED_PIN = 2;     // Built-in LED for status indication

// Signal Processing Parameters
const int SAMPLE_RATE = 100;  // Hz
const int BUFFER_SIZE = 200;  // Samples
const int PEAK_THRESHOLD = 2000;  // ADC threshold for peak detection
const int REFRACTORY_PERIOD = 250;  // ms between valid peaks

// Session Management
int currentSessionId = 0;
unsigned long sessionStartTime = 0;
bool isSessionActive = false;

// Signal Processing Variables
int signalBuffer[BUFFER_SIZE];
int bufferIndex = 0;
unsigned long lastPeakTime = 0;
int lastPeakValue = 0;
int currentBPM = 0;
int currentIBI = 0;

// WiFi Status
bool wifiConnected = false;
unsigned long lastWiFiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 30000;  // 30 seconds

// Data Transmission
unsigned long lastTransmission = 0;
const unsigned long TRANSMISSION_INTERVAL = 1000;  // Send data every second

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(PULSE_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize signal buffer
  memset(signalBuffer, 0, sizeof(signalBuffer));
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize ADC
  analogReadResolution(12);  // 12-bit ADC resolution
  
  Serial.println("CLES Heart Rate Sensor initialized");
  Serial.println("Waiting for session to start...");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check WiFi connection periodically
  if (currentTime - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    checkWiFiConnection();
    lastWiFiCheck = currentTime;
  }
  
  // Process PPG signal
  processPPGSignal();
  
  // Send data if session is active and WiFi is connected
  if (isSessionActive && wifiConnected && 
      currentTime - lastTransmission > TRANSMISSION_INTERVAL) {
    sendHeartRateData();
    lastTransmission = currentTime;
  }
  
  // Handle serial commands
  handleSerialCommands();
  
  delay(1000 / SAMPLE_RATE);  // Maintain sample rate
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));  // Blink LED while connecting
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    digitalWrite(LED_PIN, HIGH);  // Solid LED when connected
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("WiFi disconnected, attempting reconnection...");
    connectToWiFi();
  }
}

void processPPGSignal() {
  // Read ADC value
  int signalValue = analogRead(PULSE_PIN);
  
  // Store in circular buffer
  signalBuffer[bufferIndex] = signalValue;
  bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
  
  // Peak detection algorithm
  detectPeak(signalValue);
  
  // Calculate BPM and IBI
  calculateHeartRate();
}

void detectPeak(int signalValue) {
  unsigned long currentTime = millis();
  
  // Check if enough time has passed since last peak (refractory period)
  if (currentTime - lastPeakTime < REFRACTORY_PERIOD) {
    return;
  }
  
  // Simple peak detection: signal above threshold and higher than previous values
  if (signalValue > PEAK_THRESHOLD && signalValue > lastPeakValue) {
    // Check if this is actually a peak by looking at surrounding values
    bool isPeak = true;
    
    // Look at previous and next values in buffer
    for (int i = 1; i <= 3; i++) {
      int prevIndex = (bufferIndex - i + BUFFER_SIZE) % BUFFER_SIZE;
      int nextIndex = (bufferIndex + i) % BUFFER_SIZE;
      
      if (signalBuffer[prevIndex] >= signalValue || signalBuffer[nextIndex] >= signalValue) {
        isPeak = false;
        break;
      }
    }
    
    if (isPeak) {
      // Valid peak detected
      if (lastPeakTime > 0) {
        currentIBI = currentTime - lastPeakTime;
        currentBPM = 60000 / currentIBI;  // Convert ms to BPM
        
        // Clamp BPM to reasonable range
        if (currentBPM < 40) currentBPM = 40;
        if (currentBPM > 200) currentBPM = 200;
        
        Serial.print("Peak detected! IBI: ");
        Serial.print(currentIBI);
        Serial.print("ms, BPM: ");
        Serial.println(currentBPM);
      }
      
      lastPeakTime = currentTime;
      lastPeakValue = signalValue;
    }
  }
  
  // Update last peak value for comparison
  if (signalValue > lastPeakValue) {
    lastPeakValue = signalValue;
  }
}

void calculateHeartRate() {
  // Additional smoothing can be added here
  // For now, we use the IBI from peak detection
}

void sendHeartRateData() {
  if (!wifiConnected || currentIBI == 0) {
    return;
  }
  
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["sessionId"] = currentSessionId;
  doc["ts"] = millis() - sessionStartTime;  // Time since session start
  doc["ibi_ms"] = currentIBI;
  doc["bpm"] = currentBPM;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("Sending HR data: ");
  Serial.println(jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Response code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(response);
  } else {
    Serial.print("Error sending data: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.startsWith("START_SESSION:")) {
      int sessionId = command.substring(15).toInt();
      startSession(sessionId);
    } else if (command == "STOP_SESSION") {
      stopSession();
    } else if (command == "STATUS") {
      printStatus();
    } else if (command == "CALIBRATE") {
      calibrateSensor();
    }
  }
}

void startSession(int sessionId) {
  currentSessionId = sessionId;
  sessionStartTime = millis();
  isSessionActive = true;
  
  Serial.print("Session started: ");
  Serial.println(sessionId);
  
  // Reset heart rate variables
  currentBPM = 0;
  currentIBI = 0;
  lastPeakTime = 0;
}

void stopSession() {
  isSessionActive = false;
  currentSessionId = 0;
  
  Serial.println("Session stopped");
}

void printStatus() {
  Serial.println("=== CLES HR Sensor Status ===");
  Serial.print("WiFi Connected: ");
  Serial.println(wifiConnected ? "Yes" : "No");
  Serial.print("Session Active: ");
  Serial.println(isSessionActive ? "Yes" : "No");
  Serial.print("Session ID: ");
  Serial.println(currentSessionId);
  Serial.print("Current BPM: ");
  Serial.println(currentBPM);
  Serial.print("Current IBI: ");
  Serial.println(currentIBI);
  Serial.print("Signal Value: ");
  Serial.println(analogRead(PULSE_PIN));
  Serial.println("=============================");
}

void calibrateSensor() {
  Serial.println("Calibrating sensor...");
  
  int maxValue = 0;
  int minValue = 4095;
  
  for (int i = 0; i < 1000; i++) {
    int value = analogRead(PULSE_PIN);
    if (value > maxValue) maxValue = value;
    if (value < minValue) minValue = value;
    delay(10);
  }
  
  Serial.print("Signal range: ");
  Serial.print(minValue);
  Serial.print(" - ");
  Serial.println(maxValue);
  
  // Suggest threshold
  int suggestedThreshold = minValue + (maxValue - minValue) * 0.7;
  Serial.print("Suggested threshold: ");
  Serial.println(suggestedThreshold);
}
