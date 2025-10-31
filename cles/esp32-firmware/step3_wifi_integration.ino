/*
 * CLES Heart Rate Sensor Firmware - Step 3: WiFi Integration
 * ESP32 + SEN-11574 Pulse Sensor
 * 
 * This version adds:
 * - WiFi connectivity to CLES backend
 * - Automatic session management
 * - Real-time data transmission
 * - Connection status monitoring
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

Adafruit_SSD1306 display(128, 64, &Wire);

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://192.168.1.100:3000/api/ingest/hr";
// Replace 192.168.1.100 with your computer's IP address
// Find your IP: Windows (ipconfig) or Mac/Linux (ifconfig)

// ============================================================================
// HARDWARE CONFIGURATION
// ============================================================================
int PulseSensorPurplePin = 34;  // ADC1 pin
int LED = 2;                     // onboard LED

int Signal;                                    // raw 0..4095
unsigned long lastBeat = 0, refractory = 300;  // ms
int BPM = 0;

// Filters / adaptive stats
float dc = 0.0f;               // slow DC baseline
const float dcAlpha = 0.01f;   // slower -> 0.005..0.02
float band = 0.0f;             // high-passed pulse
float env = 0.0f;              // envelope (EMA of |band|)
const float envAlpha = 0.05f;  // 0.03..0.10
float k = 1.6f;                // threshold factor

// IBI tracking
unsigned long currentIBI = 0;

// WiFi and Session Management
bool wifiConnected = false;
int currentSessionId = 0;
unsigned long sessionStartTime = 0;
bool isSessionActive = false;
unsigned long lastTransmission = 0;
const unsigned long TRANSMISSION_INTERVAL = 1000;  // Send data every second

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(115200);

  // Initialize OLED display
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 allocation failed");
    for (;;); // Don't proceed
  }
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Initializing...");
  display.display();

  analogReadResolution(12);
  analogSetPinAttenuation(PulseSensorPurplePin, ADC_11db);

  // Warm-up reads
  for (int i = 0; i < 20; i++) {
    Signal = analogRead(PulseSensorPurplePin);
    delay(5);
  }
  dc = Signal;

  Serial.println("CLES Heart Rate Sensor - Step 3: WiFi Integration");
  Serial.println("==================================================");
  
  // Connect to WiFi
  connectToWiFi();
  
  Serial.println();
  Serial.println("Available Commands:");
  Serial.println("  STATUS           - Show sensor status");
  Serial.println("  GET_DATA         - Get latest BPM and IBI");
  Serial.println("  CALIBRATE        - Run sensor calibration");
  Serial.println("  START_SESSION:N  - Start session with ID N");
  Serial.println("  STOP_SESSION     - Stop current session");
  Serial.println("  HELP             - Show help message");
  Serial.println();
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Ready!");
  display.println("WiFi: ");
  display.print(wifiConnected ? "Connected" : "Disconnected");
  display.println("");
  display.println("Type START_SESSION:N");
  display.display();
}

void loop() {
  // --- read & filter ---
  Signal = analogRead(PulseSensorPurplePin);
  dc += dcAlpha * (Signal - dc);         // track DC
  band = Signal - dc;                    // remove DC
  env += envAlpha * (fabs(band) - env);  // envelope of pulse
  float thr = k * env;                   // dynamic threshold

  // --- detection with refractory ---
  static bool below = true;  // rising-edge arm
  unsigned long now = millis();

  if (below && band > thr && (now - lastBeat) > refractory) {
    // Beat!
    digitalWrite(LED, HIGH);
    if (lastBeat != 0) {
      currentIBI = now - lastBeat;
      BPM = (currentIBI > 0) ? (60000 / currentIBI) : 0;
      
      // Clamp BPM to reasonable range
      if (BPM < 40) BPM = 40;
      if (BPM > 200) BPM = 200;
      
      // Serial Monitor output
      Serial.print("Heart Beat! IBI: ");
      Serial.print(currentIBI);
      Serial.print("ms, BPM: ");
      Serial.println(BPM);
    }
    lastBeat = now;
    below = false;
  }
  if (band < thr * 0.5f) {  // re-arm when well below
    below = true;
    digitalWrite(LED, LOW);
  }

  // --- Serial Output for Plotting ---
  // Format: Signal,Threshold,BPM
  Serial.print(Signal - 1800);  // remove baseline
  Serial.print(",");
  Serial.print(thr);  // threshold
  Serial.print(",");
  Serial.println(BPM);

  // Handle serial commands
  handleSerialCommands();

  // Send data to CLES backend if session is active and we have a new heartbeat
  if (isSessionActive && wifiConnected && currentIBI > 0 && 
      now - lastTransmission > TRANSMISSION_INTERVAL) {
    sendHeartRateData();
    lastTransmission = now;
  }

  // Update display
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("BPM");
  display.setTextSize(3);
  display.setCursor(0, 30);
  display.println(BPM);
  
  // Show session status
  display.setTextSize(1);
  display.setCursor(0, 55);
  if (isSessionActive) {
    display.print("S:");
    display.print(currentSessionId);
    display.print(" ");
    display.print(wifiConnected ? "W" : "!");
  } else {
    display.print("IBI: ");
    display.print(currentIBI);
    display.print("ms");
  }
  
  display.display();

  delay(20);  // ~50 Hz sampling
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
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Server URL: ");
    Serial.println(serverURL);
  } else {
    wifiConnected = false;
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    command.toUpperCase();
    
    if (command == "STATUS") {
      printStatus();
    } else if (command == "GET_DATA") {
      getData();
    } else if (command == "CALIBRATE") {
      calibrateSensor();
    } else if (command.startsWith("START_SESSION:")) {
      int sessionId = command.substring(15).toInt();
      startSession(sessionId);
    } else if (command == "STOP_SESSION") {
      stopSession();
    } else if (command == "HELP") {
      printHelp();
    } else if (command.length() > 0) {
      Serial.print("Unknown command: ");
      Serial.println(command);
      Serial.println("Type HELP for available commands");
    }
  }
}

void startSession(int sessionId) {
  currentSessionId = sessionId;
  sessionStartTime = millis();
  isSessionActive = true;
  
  Serial.println();
  Serial.print("Session started: ");
  Serial.println(sessionId);
  Serial.println("Heart rate data will be sent to CLES backend");
  Serial.println();
  
  // Reset heart rate variables
  BPM = 0;
  currentIBI = 0;
  lastBeat = 0;
}

void stopSession() {
  isSessionActive = false;
  currentSessionId = 0;
  
  Serial.println();
  Serial.println("Session stopped");
  Serial.println();
}

void sendHeartRateData() {
  if (!wifiConnected || currentIBI == 0) {
    return;
  }
  
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2000);  // Reduce timeout to 2 seconds
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["sessionId"] = currentSessionId;
  doc["ts"] = millis() - sessionStartTime;  // Time since session start
  doc["ibi_ms"] = currentIBI;
  doc["bpm"] = BPM;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Only log every 5th transmission to reduce serial spam
  static int logCounter = 0;
  if (++logCounter % 5 == 0) {
    Serial.print("Sending HR data: ");
    Serial.println(jsonString);
  }
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    // Only log errors, not successful responses
    if (httpResponseCode != 200) {
      Serial.print("Response code: ");
      Serial.println(httpResponseCode);
    }
  } else {
    Serial.print("Error sending data: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

void printStatus() {
  Serial.println();
  Serial.println("=== CLES HR Sensor Status ===");
  Serial.print("WiFi Connected: ");
  Serial.println(wifiConnected ? "Yes" : "No");
  if (wifiConnected) {
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  }
  Serial.print("Session Active: ");
  Serial.println(isSessionActive ? "Yes" : "No");
  Serial.print("Session ID: ");
  Serial.println(currentSessionId);
  Serial.print("Current BPM: ");
  Serial.println(BPM);
  Serial.print("Current IBI: ");
  Serial.print(currentIBI);
  Serial.println("ms");
  Serial.print("Signal Value: ");
  Serial.println(Signal);
  Serial.print("Threshold: ");
  Serial.println(k * env);
  Serial.println("=============================");
  Serial.println();
}

void getData() {
  Serial.println();
  Serial.println("=== Latest HR Data ===");
  Serial.print("{\"bpm\":");
  Serial.print(BPM);
  Serial.print(",\"ibi_ms\":");
  Serial.print(currentIBI);
  Serial.print(",\"session_id\":");
  Serial.print(currentSessionId);
  Serial.print(",\"timestamp\":");
  Serial.print(millis());
  Serial.println("}");
  Serial.println();
}

void calibrateSensor() {
  Serial.println();
  Serial.println("Calibrating sensor...");
  Serial.println("Please keep finger still for 10 seconds");
  
  int maxValue = 0;
  int minValue = 4095;
  int samples = 0;
  
  unsigned long startTime = millis();
  while (millis() - startTime < 10000) {  // 10 seconds
    int value = analogRead(PulseSensorPurplePin);
    if (value > maxValue) maxValue = value;
    if (value < minValue) minValue = value;
    samples++;
    
    // Update display with countdown
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("Calibrating...");
    display.print("Time: ");
    display.print((millis() - startTime) / 1000);
    display.println("s");
    display.display();
    
    delay(10);
  }
  
  Serial.print("Samples collected: ");
  Serial.println(samples);
  Serial.print("Signal range: ");
  Serial.print(minValue);
  Serial.print(" - ");
  Serial.println(maxValue);
  
  // Calculate suggested threshold
  float baseline = (minValue + maxValue) / 2;
  float range = maxValue - minValue;
  int suggestedThreshold = baseline + (range * 0.5);
  
  Serial.print("Baseline: ");
  Serial.println(baseline);
  Serial.print("Suggested threshold: ");
  Serial.println(suggestedThreshold);
  Serial.println("Calibration complete!");
  Serial.println();
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Calibration");
  display.println("Complete!");
  display.display();
  delay(2000);
}

void printHelp() {
  Serial.println();
  Serial.println("=== Available Commands ===");
  Serial.println("STATUS           - Show sensor status");
  Serial.println("GET_DATA         - Get latest BPM and IBI");
  Serial.println("CALIBRATE        - Run sensor calibration");
  Serial.println("START_SESSION:N  - Start session with ID N");
  Serial.println("STOP_SESSION     - Stop current session");
  Serial.println("HELP             - Show this help message");
  Serial.println();
}
