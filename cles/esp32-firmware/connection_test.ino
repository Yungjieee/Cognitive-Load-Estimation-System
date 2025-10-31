/*
 * CLES ESP32 Connection Test
 * Simple test to verify ESP32 can connect to CLES backend
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configuration - Update these values
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://192.168.1.100:3000/api/ingest/hr";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("CLES ESP32 Connection Test");
  Serial.println("==========================");
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Test connection to CLES backend
  testConnection();
}

void loop() {
  // Send test data every 5 seconds
  static unsigned long lastTest = 0;
  if (millis() - lastTest > 5000) {
    sendTestData();
    lastTest = millis();
  }
}

void testConnection() {
  Serial.println("Testing connection to CLES backend...");
  
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  
  // Create test payload
  DynamicJsonDocument doc(512);
  doc["sessionId"] = 99999;  // Test session ID
  doc["ts"] = millis();
  doc["ibi_ms"] = 800;       // Simulated IBI
  doc["bpm"] = 75;           // Simulated BPM
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("Sending test data: ");
  Serial.println(jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("✅ Connection successful! Response code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(response);
  } else {
    Serial.print("❌ Connection failed! Error code: ");
    Serial.println(httpResponseCode);
    Serial.println("Check your server URL and ensure CLES backend is running");
  }
  
  http.end();
}

void sendTestData() {
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  
  // Simulate varying heart rate data
  int simulatedBPM = 70 + random(-10, 11);  // 60-80 BPM
  int simulatedIBI = 60000 / simulatedBPM;   // Convert to IBI
  
  DynamicJsonDocument doc(512);
  doc["sessionId"] = 99999;
  doc["ts"] = millis();
  doc["ibi_ms"] = simulatedIBI;
  doc["bpm"] = simulatedBPM;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("📊 Sending test data: BPM=");
  Serial.print(simulatedBPM);
  Serial.print(", IBI=");
  Serial.print(simulatedIBI);
  Serial.println("ms");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.println("✅ Data sent successfully");
  } else {
    Serial.print("❌ Failed to send data: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
