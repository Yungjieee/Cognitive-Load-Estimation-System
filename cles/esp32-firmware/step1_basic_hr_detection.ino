/*
 * CLES Heart Rate Sensor Firmware - Step 1: Basic Heart Rate Detection
 * ESP32 + SEN-11574 Pulse Sensor
 * 
 * This version focuses on:
 * - Reading heart rate from SEN-11574
 * - Displaying BPM on OLED display
 * - Serial output for debugging
 * - No WiFi/backend integration yet
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
float k = 1.6f;                // threshold factor (raise to reduce false triggers)

// IBI tracking
unsigned long currentIBI = 0;

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

  Serial.println("CLES Heart Rate Sensor - Step 1: Basic Detection");
  Serial.println("================================================");
  Serial.println("Place your finger on the sensor");
  Serial.println("Watch for BPM on display and serial output");
  Serial.println();
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Ready!");
  display.println("Place finger");
  display.println("on sensor");
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
  // This works for Serial Plotter visualization
  Serial.print(Signal - 1800);  // remove baseline for better visualization
  Serial.print(",");
  Serial.print(thr);  // threshold line
  Serial.print(",");
  Serial.println(BPM);

  // Update display
  // ----- CLEAR & SET -----
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // ----- LINE 1 : BPM -----
  display.setTextSize(2);  // Big and readable on 128x32
  display.setCursor(0, 0);
  display.print("BPM: ");
  display.println(BPM);

  // ----- LINE 2 : IBI -----
  display.setCursor(0, 18);  // second row (fits in 32px height)
  display.print("IBI:");
  display.print(currentIBI);
  display.print("ms");

  // ----- PUSH TO SCREEN -----
  display.display();

  delay(20);  // ~50 Hz sampling
}
