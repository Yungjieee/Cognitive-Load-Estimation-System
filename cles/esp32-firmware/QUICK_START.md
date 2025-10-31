# 🚀 ESP32 + SEN-11574 Quick Start Checklist

## ✅ Hardware Setup
- [ ] ESP32 board connected to computer via USB
- [ ] SEN-11574 sensor wired to ESP32:
  - [ ] VCC → 3.3V
  - [ ] GND → GND  
  - [ ] OUT → GPIO 34
- [ ] Optional: 10µF capacitor between VCC and GND

## ✅ Software Setup
- [ ] Arduino IDE installed
- [ ] ESP32 board package installed
- [ ] ArduinoJson library installed
- [ ] Board selected: "ESP32 Dev Module"
- [ ] Correct COM port selected

## ✅ Configuration
- [ ] WiFi SSID and password updated in firmware
- [ ] Server URL updated with your computer's IP address
- [ ] CLES backend running on your computer
- [ ] Both ESP32 and computer on same WiFi network

## ✅ Testing Steps

### 1. Upload Test Firmware
- [ ] Upload `connection_test.ino` first
- [ ] Open Serial Monitor (115200 baud)
- [ ] Verify WiFi connection
- [ ] Check connection to CLES backend

### 2. Upload Main Firmware
- [ ] Upload `CLES_HR_Sensor.ino`
- [ ] Monitor serial output for initialization
- [ ] Run `CALIBRATE` command
- [ ] Adjust threshold if needed

### 3. Test with CLES
- [ ] Start a session in CLES web interface
- [ ] Send `START_SESSION:12345` to ESP32
- [ ] Place finger on sensor
- [ ] Verify data appears in CLES reports

## 🔧 Troubleshooting Quick Fixes

### No WiFi Connection
```
❌ Problem: WiFi connection failed
✅ Solution: 
- Check SSID/password spelling
- Ensure 2.4GHz network (not 5GHz)
- Move closer to router
```

### No Heart Rate Data
```
❌ Problem: No peaks detected
✅ Solution:
- Run CALIBRATE command
- Adjust PEAK_THRESHOLD value
- Check finger placement on sensor
- Ensure good skin contact
```

### Server Connection Failed
```
❌ Problem: HTTP error codes
✅ Solution:
- Verify server URL and port
- Check CLES backend is running
- Ensure same network
- Check firewall settings
```

### Poor Signal Quality
```
❌ Problem: Erratic readings
✅ Solution:
- Add 10µF capacitor
- Ensure stable power supply
- Clean sensor surface
- Apply consistent finger pressure
```

## 📊 Expected Serial Output

### Successful Connection
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

### Calibration Output
```
Calibrating sensor...
Signal range: 1200 - 2800
Suggested threshold: 2320
```

## 🎯 Next Steps After Setup

1. **Test Basic Functionality**
   - Upload connection test firmware
   - Verify WiFi and server connection

2. **Calibrate Sensor**
   - Upload main firmware
   - Run calibration command
   - Adjust threshold if needed

3. **Integrate with CLES**
   - Start a session in CLES
   - Send session ID to ESP32
   - Monitor real-time data

4. **Optimize Performance**
   - Fine-tune signal processing parameters
   - Adjust transmission intervals
   - Monitor battery life (if battery-powered)

## 📞 Support Commands

Send these commands via Serial Monitor:

| Command | Description |
|---------|-------------|
| `STATUS` | Show connection and sensor status |
| `CALIBRATE` | Run sensor calibration |
| `START_SESSION:12345` | Start session with ID 12345 |
| `STOP_SESSION` | Stop current session |

## 🔗 Integration with CLES

Once working, the ESP32 will:
1. Connect to your WiFi network
2. Send heart rate data to CLES backend
3. Display real-time HR sparkline in CLES interface
4. Generate HRV analysis in session reports

The system is now ready for real-time physiological monitoring during CLES sessions!
