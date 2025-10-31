# 🧪 Step-by-Step Testing Plan for ESP32 + SEN-11574

## 📋 Test Plan Overview

We'll test the sensor integration in 3 progressive steps:

1. **Step 1: Basic Heart Rate Detection** ✅ (Your current working code)
2. **Step 2: Serial Communication** (Add serial commands)
3. **Step 3: WiFi Integration** (Connect to CLES backend)

---

## ✅ Step 1: Basic Heart Rate Detection (Current Status)

### What You Need:
- [x] ESP32 board with SEN-11574 sensor
- [x] OLED display (optional but recommended)
- [x] Your working code

### What to Test:
1. **Sensor Reading**
   - Place finger on sensor
   - Verify LED blinks with heartbeat
   - Check Serial Monitor for BPM values

2. **Expected Output:**
   ```
   Heart Beat! IBI: 812ms, BPM: 74
   Heart Beat! IBI: 834ms, BPM: 72
   Heart Beat! IBI: 789ms, BPM: 76
   ```

3. **OLED Display:**
   - Shows current BPM in large numbers
   - Shows IBI (Inter-Beat Interval) below

### Success Criteria:
- ✅ LED blinks with each heartbeat
- ✅ BPM values between 60-100 for resting heart rate
- ✅ IBI values between 600-1000ms (reasonable range)
- ✅ OLED display updates in real-time

### Troubleshooting:
- **No heartbeat detected**: Adjust finger placement, ensure good contact
- **Erratic readings**: Wait for sensor to stabilize (1-2 seconds)
- **BPM too high/low**: Check sensor contact and ambient light

---

## 🔄 Step 2: Serial Communication (Next Step)

### Objective:
Add serial commands to control the sensor and test data transmission

### What to Add:
1. Serial command handler
2. Test commands:
   - `STATUS` - Show current status
   - `CALIBRATE` - Run calibration
   - `GET_DATA` - Get latest BPM and IBI

### Test Commands:
```
Serial Monitor Commands:
> STATUS
> CALIBRATE
> GET_DATA
```

### Expected Output:
```
> STATUS
=== HR Sensor Status ===
BPM: 72
IBI: 833ms
Signal: 2456
Threshold: 156
===

> CALIBRATE
Calibrating sensor...
Signal range: 1200 - 2800
Suggested threshold: 2320

> GET_DATA
{"bpm":72,"ibi_ms":833,"timestamp":12345}
```

---

## 🌐 Step 3: WiFi Integration (Final Step)

### Objective:
Connect ESP32 to CLES backend and send heart rate data

### Prerequisites:
- [ ] Step 1 working perfectly
- [ ] Step 2 tested
- [ ] WiFi credentials configured
- [ ] CLES backend running

### Configuration Needed:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://192.168.1.100:3000/api/ingest/hr";
```

### Test Commands:
```
> START_SESSION:12345
> STATUS
> STOP_SESSION
```

### Expected Output:
```
> START_SESSION:12345
Session started: 12345
Connecting to WiFi...
WiFi connected!
IP address: 192.168.1.150
Sending HR data: {"sessionId":12345,"ts":5000,"ibi_ms":812,"bpm":74}
Response code: 200

> STATUS
WiFi Connected: Yes
Session Active: Yes
Session ID: 12345
Current BPM: 74
Current IBI: 812ms

> STOP_SESSION
Session stopped
```

---

## 🎯 Current Testing Instructions

### Right Now - Test Step 1:

1. **Upload the `step1_basic_hr_detection.ino` code**

2. **Open Serial Monitor** (115200 baud)

3. **Place your finger** on the SEN-11574 sensor

4. **Watch for output:**
   ```
   Heart Beat! IBI: 812ms, BPM: 74
   Heart Beat! IBI: 834ms, BPM: 72
   ```

5. **Verify OLED display** shows:
   - Large BPM number
   - IBI value below

### What to Report:
- [ ] BPM readings (should be 60-100 for resting)
- [ ] IBI values (should be 600-1000ms)
- [ ] LED blinks with heartbeat
- [ ] OLED display updates correctly

### Once Step 1 Works:
Let me know and I'll provide Step 2 code (Serial Communication)!

---

## 📊 Expected Data Format

When working correctly, you should see:
- **BPM**: 60-100 beats per minute (resting)
- **IBI**: 600-1000 milliseconds between beats
- **Signal**: Raw ADC values (0-4095)
- **Threshold**: Dynamic threshold for peak detection

## 🔧 Troubleshooting Guide

### No Heartbeat Detected
1. Check sensor wiring (VCC, GND, OUT)
2. Ensure finger covers sensor LED completely
3. Try different finger positions
4. Check ambient lighting (avoid bright light)

### Erratic Readings
1. Wait 2-3 seconds for sensor to stabilize
2. Apply consistent finger pressure
3. Keep finger still during measurement
4. Check for loose connections

### BPM Values Too High/Low
1. Normal resting BPM: 60-100
2. If showing 0 or very high (>120), check sensor contact
3. Ensure LED is covered by finger
4. Try recalibrating

---

## ✅ Next Steps After Step 1 Works

Once you confirm Step 1 is working:
1. Report the BPM and IBI values you're seeing
2. Confirm LED and OLED display are working
3. I'll provide Step 2 code (Serial Communication)
4. Then Step 3 (WiFi Integration)

Let's start with Step 1! Upload the code and let me know what you see.
