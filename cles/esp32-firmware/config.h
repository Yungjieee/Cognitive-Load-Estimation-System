/*
 * CLES ESP32 Configuration File
 * Copy this to your Arduino sketch and update the values
 */

// ============================================================================
// WIFI CONFIGURATION
// ============================================================================
const char* ssid = "YOUR_WIFI_NETWORK_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================
// Replace with your computer's IP address where CLES is running
// Find your IP: Windows (ipconfig) or Mac/Linux (ifconfig)
const char* serverURL = "http://192.168.1.100:3000/api/ingest/hr";

// ============================================================================
// HARDWARE CONFIGURATION
// ============================================================================
const int PULSE_PIN = 34;        // GPIO pin connected to SEN-11574 OUT
const int LED_PIN = 2;           // Built-in LED pin for status

// ============================================================================
// SENSOR CALIBRATION
// ============================================================================
// Run CALIBRATE command in Serial Monitor to find optimal values
const int PEAK_THRESHOLD = 2000;     // ADC threshold for peak detection
const int REFRACTORY_PERIOD = 250;   // Minimum ms between valid peaks

// ============================================================================
// SIGNAL PROCESSING
// ============================================================================
const int SAMPLE_RATE = 100;         // Hz - higher = better resolution
const int BUFFER_SIZE = 200;        // Samples for signal processing

// ============================================================================
// NETWORK SETTINGS
// ============================================================================
const unsigned long WIFI_CHECK_INTERVAL = 30000;   // Check WiFi every 30s
const unsigned long TRANSMISSION_INTERVAL = 1000;   // Send data every 1s

// ============================================================================
// DEBUG SETTINGS
// ============================================================================
const bool DEBUG_MODE = true;        // Enable detailed serial output
const bool LED_STATUS = true;        // Use LED for status indication
