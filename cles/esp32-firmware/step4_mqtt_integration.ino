/*
 * CLES Heart Rate Sensor Firmware - Step 4: MQTT Integration
 * ESP32 + SEN-11574 Pulse Sensor
 * 
 * This version uses MQTT for fast, non-blocking data transmission
 * Much faster than HTTP - no blocking delays
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

Adafruit_SSD1306 display(128, 64, &Wire);

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker Configuration
const char* mqtt_server = "192.168.1.100";  // Your computer's IP
const int mqtt_port = 1883;
// Topic will be dynamic: "cles/hr/<sessionId>/beat"

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

// WiFi and MQTT
WiFiClient espClient;
PubSubClient client(espClient);
bool wifiConnected = false;
bool mqttConnected = false;

// Session Management
int currentSessionId = 0;
unsigned long sessionStartTime = 0;
bool isSessionActive = false;

// UI Summary (Step 7)
unsigned long lastUISummary = 0;
const unsigned long UI_SUMMARY_INTERVAL = 1000;  // 1 second

// Artifact Filtering (Step 8)
const int IBI_VALID_MIN = 300;    // ms (≈ 200 BPM max)
const int IBI_VALID_MAX = 2000;   // ms (≈ 30 BPM min)
const int IBI_DELTA_MAX = 200;    // ms (max difference between successive IBIs)
unsigned long lastValidIBI = 0;   // Track last accepted IBI for delta check

// Calibration Control (Step 9)
bool isCalibrating = false;
unsigned long calibrationStartTime = 0;

// Beat counter
int beatCounter = 0;

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

  Serial.println("CLES Heart Rate Sensor - Step 4: MQTT Integration");
  Serial.println("==================================================");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
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
      
      // Step 8: Apply artifact filtering before processing
      // During calibration, use relaxed validation to ensure we get enough beats
      bool isValid = false;
      if (isCalibrating) {
        // Relaxed validation for calibration: wider IBI range, no delta check
        // Accept 250-2500ms (24-240 BPM) to ensure we capture beats
        if (currentIBI >= 250 && currentIBI <= 2500) {
          isValid = true;
          Serial.print("📋 Calibration beat accepted (relaxed): IBI ");
          Serial.print(currentIBI);
          Serial.println("ms");
        }
      } else {
        // Strict validation for normal session
        isValid = isValidIBI(currentIBI);
      }

      if (isValid) {
        BPM = (currentIBI > 0) ? (60000 / currentIBI) : 0;

        // Clamp BPM to reasonable range
        if (BPM < 40) BPM = 40;
        if (BPM > 200) BPM = 200;

        // Update last valid IBI for delta checking
        lastValidIBI = currentIBI;

        // Serial Monitor output
        Serial.print("Heart Beat! IBI: ");
        Serial.print(currentIBI);
        Serial.print("ms, BPM: ");
        Serial.println(BPM);

        // Send data via MQTT immediately on beat detection (Step 5)
        if (isSessionActive && mqttConnected && currentIBI > 0) {
          sendHeartRateDataMQTT();
        }
      } else {
        // Artifact detected - log but don't process
        Serial.print("Artifact rejected: IBI ");
        Serial.print(currentIBI);
        Serial.println("ms");
      }
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

  // Handle serial commands (non-blocking, check if available)
  handleSerialCommands();

  // Step 11: Check WiFi connection status
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      Serial.println("⚠️ WiFi disconnected! Attempting reconnection...");
      wifiConnected = false;
      mqttConnected = false;  // MQTT will also disconnect
    }
    // Attempt reconnection
    connectToWiFi();
  } else {
    if (!wifiConnected) {
      Serial.println("✅ WiFi reconnected!");
      wifiConnected = true;
    }
  }

  // Send UI summary every second (Step 7)
  if (isSessionActive && mqttConnected && 
      now - lastUISummary > UI_SUMMARY_INTERVAL) {
    sendUISummaryMQTT();
    lastUISummary = now;
  }

  // Send global heartbeat every 5 seconds (session-independent)
  static unsigned long lastHeartbeat = 0;
  if (mqttConnected && now - lastHeartbeat > 5000) {
    sendGlobalHeartbeatMQTT();
    lastHeartbeat = now;
  }

  // Maintain MQTT connection (do this last, after sensor processing)
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();  // Non-blocking MQTT processing

  // Update display
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("BPM");
  display.setTextSize(3);
  display.setCursor(0, 30);
  display.println(BPM);
  
  // Step 11: Show connection status
  display.setTextSize(1);
  display.setCursor(0, 55);
  if (isSessionActive) {
    display.print("S:");
    display.print(currentSessionId);
    display.print(" ");
    display.print(wifiConnected ? "W" : "!");
    display.print(mqttConnected ? "M" : "!");
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
  
  // Ensure WiFi is in station mode
  WiFi.mode(WIFI_STA);
  
  // Disconnect any existing connection
  WiFi.disconnect();
  delay(100);
  
  // Start connection
  WiFi.begin(ssid, password);
  
  // Wait for connection with longer timeout and better feedback
  int attempts = 0;
  int maxAttempts = 30;  // Increased from 20 to 30
  
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Show progress every 5 attempts
    if (attempts % 5 == 0) {
      Serial.print("(");
      Serial.print(attempts);
      Serial.print("/");
      Serial.print(maxAttempts);
      Serial.print(")");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println();
    Serial.println("✅ WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.print("MQTT Server: ");
    Serial.println(mqtt_server);
  } else {
    wifiConnected = false;
    Serial.println();
    Serial.println("❌ WiFi connection failed!");
    Serial.println("Please check:");
    Serial.println("Restarting in 5 seconds...");
    delay(5000);
    ESP.restart();  // Restart ESP32 to retry connection
  }
}

void reconnectMQTT() {
  if (!wifiConnected) return;
  
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    // Create a unique client ID
    String clientId = "CLES-HR-Sensor-";
    clientId += String(random(0xffff), HEX);
    
    // Connect without last-will for now (we use heartbeat instead)
    if (client.connect(clientId.c_str())) {
      mqttConnected = true;
      Serial.println("MQTT connected!");
      
      // Send sensor online status immediately after connection
      sendSensorStatusMQTT("sensor_online");
      Serial.println("✅ Sensor online status sent");
      
      // Step 10: Subscribe to general control topic for remote commands
      client.subscribe("cles/hr/+/ctrl");
      Serial.println("Subscribed to control topic pattern: cles/hr/+/ctrl");
      
      // Also subscribe to specific session control if session is active
      if (currentSessionId > 0) {
        String controlTopic = "cles/hr/" + String(currentSessionId) + "/ctrl";
        client.subscribe(controlTopic.c_str());
        Serial.print("Also subscribed to specific topic: ");
        Serial.println(controlTopic);
      }
    } else {
      mqttConnected = false;
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Step 10: Handle MQTT control commands
  String topicStr = String(topic);
  String payloadStr = "";
  
  // Convert payload to string
  for (int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }
  
  Serial.print("MQTT message [");
  Serial.print(topicStr);
  Serial.print("]: ");
  Serial.println(payloadStr);
  
  // Check if this is a control topic
  if (topicStr.indexOf("/ctrl") > 0) {
    // Parse JSON command
    DynamicJsonDocument doc(256);
    DeserializationError error = deserializeJson(doc, payloadStr);
    
    if (error) {
      Serial.print("JSON parse failed: ");
      Serial.println(error.c_str());
      return;
    }
    
    String cmd = doc["cmd"];
    int sessionId = doc["sessionId"];
    
    if (cmd == "start") {
      Serial.print("Remote start command for session: ");
      Serial.println(sessionId);
      startSession(sessionId);
      
      // Subscribe to control topic for this session
      String controlTopic = "cles/hr/" + String(sessionId) + "/ctrl";
      client.subscribe(controlTopic.c_str());
      Serial.print("Subscribed to: ");
      Serial.println(controlTopic);
      
    } else if (cmd == "stop") {
      Serial.println("Remote stop command received");
      stopSession();
    } else if (cmd == "calibrate") {
      Serial.print("Remote calibrate command received for session: ");
      Serial.println(sessionId);
      // Set the sessionId and activate session before starting calibration
      currentSessionId = sessionId;
      sessionStartTime = millis();  // Reset session start time for calibration
      isSessionActive = true;  // Activate session immediately
      // Reset beat counter for this calibration session
      beatCounter = 0;
      Serial.println("Beat counter reset to 0");
      Serial.print("Session start time set to: ");
      Serial.println(sessionStartTime);
      // Now start calibration with active session
      calibrateSensor();
    } else {
      Serial.print("Unknown command: ");
      Serial.println(cmd);
    }
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
      // For manual calibration command, ensure session is set up
      if (!isSessionActive && currentSessionId == 0) {
        Serial.println("⚠️ No active session. Please use START_SESSION:N first, or use remote calibrate command.");
      } else {
        sessionStartTime = millis();  // Reset session start time
        calibrateSensor();
      }
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
  Serial.println("Heart rate data will be sent via MQTT");
  
  // Step 10: Subscribe to control topic for this session
  if (mqttConnected) {
    String controlTopic = "cles/hr/" + String(sessionId) + "/ctrl";
    client.subscribe(controlTopic.c_str());
    Serial.print("Subscribed to control topic: ");
    Serial.println(controlTopic);
  }
  
  Serial.println();
  
  // Reset heart rate variables
  BPM = 0;
  currentIBI = 0;
  lastBeat = 0;
  
  // Reset beat counter
  beatCounter = 0;
}

void stopSession() {
  isSessionActive = false;
  currentSessionId = 0;
  
  Serial.println();
  Serial.println("Session stopped");
  Serial.println();
}

void sendHeartRateDataMQTT() {
  if (!mqttConnected || currentIBI == 0) {
    return;
  }
  
  // Increment beat counter
  beatCounter++;
  
  // Create dynamic topic: "cles/hr/<sessionId>/beat" (Step 6)
  String topic = "cles/hr/" + String(currentSessionId) + "/beat";
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["sessionId"] = currentSessionId;
  doc["ts"] = millis() - sessionStartTime;  // Time since session start
  doc["ibi_ms"] = currentIBI;
  doc["bpm"] = BPM;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Publish to dynamic topic with QoS 1 and retain=false
  bool success = client.publish(topic.c_str(), jsonString.c_str(), false);  // QoS 1, retain=false
  
  // Log every beat with counter to compare with backend
  Serial.print("💓 Beat #");
  Serial.print(beatCounter);
  Serial.print(" sent: BPM ");
  Serial.print(BPM);
  Serial.print(", IBI ");
  Serial.print(currentIBI);
  Serial.println("ms");
  
  if (!success) {
    Serial.println("Failed to publish MQTT message");
  }
}

bool isValidIBI(unsigned long ibi) {
  // Step 8: Basic artifact rejection
  // Check IBI range (300-2000 ms = 30-200 BPM)
  if (ibi < IBI_VALID_MIN || ibi > IBI_VALID_MAX) {
    return false;
  }
  
  // Check delta from last valid IBI (max 200ms difference)
  if (lastValidIBI > 0 && abs((long)(ibi - lastValidIBI)) > IBI_DELTA_MAX) {
    return false;
  }
  
  return true;
}

void sendCalibrationStatusMQTT(String phase, int timeSec = 0) {
  if (!mqttConnected) return;
  
  // Create calibration control topic: "cles/hr/<sessionId>/ctrl" (Step 9)
  String topic = "cles/hr/" + String(currentSessionId) + "/ctrl";
  
  // Create calibration status payload
  DynamicJsonDocument doc(256);
  doc["phase"] = phase;
  if (timeSec > 0) {
    doc["t"] = timeSec;
  }
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Publish calibration status
  client.publish(topic.c_str(), jsonString.c_str());
}

void sendUISummaryMQTT() {
  if (!mqttConnected || !isSessionActive) {
    return;
  }
  
  // Create UI summary topic: "cles/hr/<sessionId>/ui/sec" (Step 7)
  String topic = "cles/hr/" + String(currentSessionId) + "/ui/sec";
  
  // Create lightweight UI summary payload
  DynamicJsonDocument doc(256);
  doc["sessionId"] = currentSessionId;
  doc["ts"] = millis() - sessionStartTime;  // Time since session start
  doc["bpm"] = BPM;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Publish UI summary (QoS 0 for UI data)
  client.publish(topic.c_str(), jsonString.c_str());
}

void sendSensorStatusMQTT(String status) {
  if (!mqttConnected) return;

  // Create sensor status topic: "cles/hr/status"
  String topic = "cles/hr/status";

  // Create sensor status payload
  DynamicJsonDocument doc(256);
  doc["phase"] = status;
  doc["timestamp"] = millis();
  doc["sessionId"] = currentSessionId;
  doc["bpm"] = BPM;
  doc["isSessionActive"] = isSessionActive;

  String jsonString;
  serializeJson(doc, jsonString);

  // Publish sensor status
  client.publish(topic.c_str(), jsonString.c_str());

  Serial.print("Sensor status sent: ");
  Serial.println(status);
}

void sendGlobalHeartbeatMQTT() {
  if (!mqttConnected) return;

  // Global heartbeat topic (session-independent): "cles/hr/heartbeat"
  String topic = "cles/hr/heartbeat";

  // Create unique device ID based on MAC address
  String deviceId = "ESP32-" + WiFi.macAddress();
  deviceId.replace(":", "");  // Remove colons from MAC

  // Create heartbeat payload
  DynamicJsonDocument doc(256);
  doc["deviceId"] = deviceId;
  doc["status"] = "online";
  doc["timestamp"] = millis();
  doc["bpm"] = BPM;
  doc["sessionActive"] = isSessionActive;
  if (isSessionActive) {
    doc["sessionId"] = currentSessionId;
  }

  String jsonString;
  serializeJson(doc, jsonString);

  // Publish global heartbeat (QoS 0, non-critical)
  client.publish(topic.c_str(), jsonString.c_str());

  // Log heartbeat (less verbose than regular beats)
  static int heartbeatCount = 0;
  heartbeatCount++;
  if (heartbeatCount % 6 == 1) {  // Log every ~30 seconds (every 6th heartbeat)
    Serial.print("💚 Heartbeat sent: ");
    Serial.print(deviceId);
    Serial.print(" (count: ");
    Serial.print(heartbeatCount);
    Serial.println(")");
  }
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
  Serial.print("MQTT Connected: ");
  Serial.println(mqttConnected ? "Yes" : "No");
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
  Serial.println("🔧 Starting calibration...");
  Serial.println("Please keep finger still for 10 seconds");
  
  // Ensure session is active so HR data will be sent
  if (!isSessionActive) {
    Serial.println("⚠️ Session not active, starting temporary session...");
    isSessionActive = true;
  }
  
  // Reset beat counter at the start of calibration
  beatCounter = 0;
  
  Serial.print("Calibrating with session ID: ");
  Serial.println(currentSessionId);
  
  isCalibrating = true;
  unsigned long calibrationStartTime = millis();
  
  // Update display with countdown
  unsigned long startTime = millis();
  while (millis() - startTime < 10000) {  // 10 seconds
    // Run normal loop to detect heartbeats and send data
    Signal = analogRead(PulseSensorPurplePin);
    dc += dcAlpha * (Signal - dc);
    band = Signal - dc;
    env += envAlpha * (fabs(band) - env);
    float thr = k * env;
    
    static bool below = true;
    unsigned long now = millis();
    
    // Detect heartbeat
    if (below && band > thr && (now - lastBeat) > refractory) {
      digitalWrite(LED, HIGH);
      if (lastBeat != 0) {
        currentIBI = now - lastBeat;

        // Use relaxed validation during calibration (250-2500ms range)
        if (currentIBI >= 250 && currentIBI <= 2500) {
          BPM = (currentIBI > 0) ? (60000 / currentIBI) : 0;
          if (BPM < 40) BPM = 40;
          if (BPM > 200) BPM = 200;

          lastValidIBI = currentIBI;

          Serial.print("📋 Calibration beat: IBI ");
          Serial.print(currentIBI);
          Serial.print("ms, BPM ");
          Serial.println(BPM);

          // Send heart rate data for calibration
          sendHeartRateDataMQTT();
        } else {
          Serial.print("⚠️ Beat rejected (out of range): IBI ");
          Serial.print(currentIBI);
          Serial.println("ms");
        }
      }
      lastBeat = now;
      below = false;
    }
    if (band < thr * 0.5f) {
      below = true;
      digitalWrite(LED, LOW);
    }
    
    // Update display
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("Calibrating...");
    display.print("Time: ");
    display.print((now - startTime) / 1000);
    display.println("s");
    
    display.setTextSize(2);
    display.setCursor(0, 20);
    display.println("BPM");
    display.setTextSize(3);
    display.setCursor(0, 40);
    display.println(BPM);
    display.display();
    
    // Maintain MQTT connection
    if (!client.connected()) {
      reconnectMQTT();
    }
    client.loop();
    
    delay(20);  // ~50 Hz sampling
  }
  
  Serial.println("✅ Calibration complete!");
  Serial.println();
  
  // Send calibration_done message to backend
  sendCalibrationStatusMQTT("calibration_done");
  Serial.println("📡 Sent calibration_done message to backend");
  
  // Stop the session after calibration
  isCalibrating = false;
  isSessionActive = false; // ESP32 will be restarted when user clicks "Start Task"
  Serial.println("🛑 Calibration session stopped. Waiting for start command...");
  
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
  Serial.println("HELP             - Show help message");
  Serial.println();
}
