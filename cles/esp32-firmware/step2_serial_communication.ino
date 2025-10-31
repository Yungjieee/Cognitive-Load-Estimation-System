/*
 * CLES Heart Rate Sensor Firmware - Step 2: Serial Communication
 * ESP32 + SEN-11574 Pulse Sensor
 * 
 * This version adds:
 * - Serial command handling
 * - Status commands
 * - Data request commands
 * - Calibration command
 * - Still no WiFi/backend integration
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire);

// Sensor Configuration
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

// Serial command buffer
String serialBuffer = "";

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

  Serial.println("CLES Heart Rate Sensor - Step 2: Serial Communication");
  Serial.println("=======================================================");
  Serial.println("Available Commands:");
  Serial.println("  STATUS      - Show sensor status");
  Serial.println("  GET_DATA    - Get latest BPM and IBI");
  Serial.println("  CALIBRATE   - Run sensor calibration");
  Serial.println("  HELP        - Show this help message");
  Serial.println();
  Serial.println("Place your finger on the sensor");
  Serial.println();
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Ready!");
  display.println("Place finger");
  display.println("on sensor");
  display.println("");
  display.println("Type STATUS");
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

  // Update display
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("BPM");
  display.setTextSize(3);
  display.setCursor(0, 30);
  display.println(BPM);
  
  // Show IBI below BPM
  display.setTextSize(1);
  display.setCursor(0, 55);
  display.print("IBI: ");
  display.print(currentIBI);
  display.print("ms");
  
  display.display();

  delay(20);  // ~50 Hz sampling
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
    } else if (command == "HELP") {
      printHelp();
    } else if (command.length() > 0) {
      Serial.print("Unknown command: ");
      Serial.println(command);
      Serial.println("Type HELP for available commands");
    }
  }
}

void printStatus() {
  Serial.println();
  Serial.println("=== CLES HR Sensor Status ===");
  Serial.print("Current BPM: ");
  Serial.println(BPM);
  Serial.print("Current IBI: ");
  Serial.print(currentIBI);
  Serial.println("ms");
  Serial.print("Signal Value: ");
  Serial.println(Signal);
  Serial.print("Raw Signal: ");
  Serial.println(Signal - 1800);
  Serial.print("Threshold: ");
  Serial.println(k * env);
  Serial.print("Last Beat: ");
  Serial.print(millis() - lastBeat);
  Serial.println("ms ago");
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
  Serial.print(",\"signal\":");
  Serial.print(Signal);
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
  display.println("");
  display.print("Range: ");
  display.print(minValue);
  display.print("-");
  display.print(maxValue);
  display.display();
  delay(2000);
}

void printHelp() {
  Serial.println();
  Serial.println("=== Available Commands ===");
  Serial.println("STATUS      - Show sensor status");
  Serial.println("GET_DATA    - Get latest BPM and IBI");
  Serial.println("CALIBRATE   - Run sensor calibration");
  Serial.println("HELP        - Show this help message");
  Serial.println();
}
