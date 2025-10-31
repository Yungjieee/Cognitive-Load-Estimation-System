# CLES ESP32 Heart Rate Sensor Setup Guide

## 📋 Prerequisites

### Hardware Required
- ESP32 development board (ESP32-WROOM-32 or similar)
- SEN-11574 Pulse Sensor Module
- Breadboard and jumper wires
- 10µF capacitor (optional, for noise filtering)
- USB cable for programming

### Software Required
- Arduino IDE (latest version)
- ESP32 board package for Arduino IDE
- Required libraries (will be installed automatically)

## 🔧 Hardware Setup

### 1. Wiring Diagram
```
SEN-11574 Pulse Sensor    ESP32 Board
─────────────────────     ──────────
VCC (Red wire)      →     3.3V
GND (Black wire)    →     GND
OUT (Purple wire)   →     GPIO 34 (ADC1_CH6)
```

### 2. Optional Noise Filtering
Add a 10µF capacitor between VCC and GND on the sensor for better signal stability.

### 3. Power Supply
- Use ESP32's built-in 3.3V regulator
- For better stability, consider external 3.3V regulator
- Ensure stable power supply (avoid USB power from laptop if unstable)

## 💻 Software Setup

### 1. Install Arduino IDE
Download from: https://www.arduino.cc/en/software

### 2. Install ESP32 Board Package
1. Open Arduino IDE
2. Go to File → Preferences
3. Add this URL to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to Tools → Board → Boards Manager
5. Search for "ESP32" and install "esp32 by Espressif Systems"

### 3. Select Board and Port
1. Go to Tools → Board → ESP32 Arduino → "ESP32 Dev Module"
2. Go to Tools → Port → Select your ESP32's COM port
3. Set these additional settings:
   - Upload Speed: 115200
   - CPU Frequency: 240MHz
   - Flash Frequency: 80MHz
   - Flash Mode: QIO
   - Flash Size: 4MB
   - Partition Scheme: Default 4MB with spiffs

### 4. Install Required Libraries
The firmware uses these built-in libraries:
- WiFi (built-in)
- HTTPClient (built-in)
- ArduinoJson (install from Library Manager)

To install ArduinoJson:
1. Go to Tools → Manage Libraries
2. Search for "ArduinoJson"
3. Install "ArduinoJson by Benoit Blanchon"

## ⚙️ Configuration

### 1. WiFi Settings
Edit these lines in the firmware:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. Server URL
Update the server URL to match your CLES backend:
```cpp
const char* serverURL = "http://YOUR_LOCAL_IP:3000/api/ingest/hr";
```

To find your computer's IP address:
- Windows: `ipconfig` in Command Prompt
- Mac/Linux: `ifconfig` in Terminal
- Look for IPv4 address (e.g., 192.168.1.100)

### 3. Sensor Calibration
The firmware includes automatic calibration. You can also manually adjust:
```cpp
const int PEAK_THRESHOLD = 2000;  // Adjust based on your sensor
```

## 🚀 Deployment Steps

### 1. Upload Firmware
1. Connect ESP32 to computer via USB
2. Open the firmware file in Arduino IDE
3. Configure WiFi and server settings
4. Click Upload (→ button)

### 2. Monitor Serial Output
1. Open Serial Monitor (Tools → Serial Monitor)
2. Set baud rate to 115200
3. You should see initialization messages

### 3. Test Connection
Send these commands via Serial Monitor:
- `STATUS` - Check connection status
- `CALIBRATE` - Run sensor calibration
- `START_SESSION:12345` - Start a test session
- `STOP_SESSION` - Stop the session

## 🔍 Troubleshooting

### Common Issues

#### WiFi Connection Failed
- Check SSID and password
- Ensure WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)
- Check WiFi signal strength
- Try restarting ESP32

#### No Heart Rate Data
- Check sensor wiring
- Run `CALIBRATE` command to check signal range
- Adjust `PEAK_THRESHOLD` if needed
- Ensure finger is properly placed on sensor

#### Server Connection Failed
- Verify server URL and port
- Check if CLES backend is running
- Ensure ESP32 and computer are on same network
- Check firewall settings

#### Poor Signal Quality
- Add 10µF capacitor between VCC and GND
- Ensure stable power supply
- Check sensor positioning
- Clean sensor surface

### Signal Quality Tips
1. **Finger Placement**: Place finger firmly over sensor, covering the LED
2. **Lighting**: Avoid bright ambient light
3. **Movement**: Keep finger still during measurement
4. **Pressure**: Apply gentle, consistent pressure
5. **Skin Contact**: Ensure good skin contact (not too dry/cold)

## 📊 Expected Output

### Serial Monitor Output
```
CLES Heart Rate Sensor initialized
Waiting for session to start...
WiFi connected!
IP address: 192.168.1.150
Session started: 12345
Peak detected! IBI: 812ms, BPM: 74
Sending HR data: {"sessionId":12345,"ts":5000,"ibi_ms":812,"bpm":74}
Response code: 200
```

### Data Format
The ESP32 sends JSON data to `/api/ingest/hr`:
```json
{
  "sessionId": 12345,
  "ts": 5000,
  "ibi_ms": 812,
  "bpm": 74
}
```

## 🔄 Integration with CLES

### 1. Start Session
When a user starts a session in CLES, the system will:
1. Create a session in the database
2. Send session ID to ESP32 (via serial or future WebSocket)
3. ESP32 begins sending heart rate data

### 2. Real-time Monitoring
- ESP32 sends data every second
- CLES backend stores data in `hr_beats` table
- Frontend displays live HR sparkline

### 3. Session End
- ESP32 stops sending data
- CLES processes HRV metrics
- Reports show HRV analysis

## 📈 Advanced Configuration

### Signal Processing Tuning
```cpp
const int SAMPLE_RATE = 100;        // Increase for better resolution
const int BUFFER_SIZE = 200;        // Larger buffer for better filtering
const int PEAK_THRESHOLD = 2000;    // Adjust based on calibration
const int REFRACTORY_PERIOD = 250;  // Minimum time between peaks
```

### Network Settings
```cpp
const unsigned long WIFI_CHECK_INTERVAL = 30000;  // WiFi check frequency
const unsigned long TRANSMISSION_INTERVAL = 1000; // Data send frequency
```

## 🛠️ Future Enhancements

### Planned Features
- WebSocket connection for real-time communication
- Automatic session start/stop via CLES backend
- Advanced signal filtering algorithms
- Battery power optimization
- OTA (Over-The-Air) firmware updates

### Customization Options
- Adjustable sample rates
- Configurable peak detection algorithms
- Multiple sensor support
- Data logging to SD card
- Bluetooth connectivity option
