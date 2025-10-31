# 🌐 Step 3: WiFi Integration - Testing Guide

## ✅ Prerequisites

Before testing Step 3, make sure:
- [x] Step 1 works (heart rate detection)
- [x] Step 2 works (serial commands)
- [ ] CLES backend is running on your computer
- [ ] You know your computer's IP address
- [ ] ESP32 and computer are on the same WiFi network

## ⚙️ Configuration

### 1. Update WiFi Credentials
Edit these lines in `step3_wifi_integration.ino`:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. Update Server URL
Edit this line with your computer's IP address:
```cpp
const char* serverURL = "http://192.168.1.100:3000/api/ingest/hr";
```

**To find your IP address:**
- **Windows**: Open Command Prompt → type `ipconfig` → look for IPv4 Address
- **Mac/Linux**: Open Terminal → type `ifconfig` → look for inet address

**Example:**
- If your IP is `192.168.1.105`, use: `http://192.168.1.105:3000/api/ingest/hr`

## 🚀 Testing Steps

### 1. Upload Firmware
1. Update WiFi credentials and server URL
2. Upload `step3_wifi_integration.ino` to ESP32
3. Open Serial Monitor (115200 baud)

### 2. Check WiFi Connection
You should see:
```
Connecting to WiFi: YOUR_WIFI_SSID
..........
WiFi connected!
IP address: 192.168.1.150
Server URL: http://192.168.1.100:3000/api/ingest/hr
```

### 3. Test Session Start
Send command:
```
START_SESSION:12345
```

Expected output:
```
Session started: 12345
Heart rate data will be sent to CLES backend
```

### 4. Verify Data Transmission
You should see messages like:
```
Heart Beat! IBI: 812ms, BPM: 74
Sending HR data: {"sessionId":12345,"ts":5000,"ibi_ms":812,"bpm":74}
Response code: 200
```

### 5. Check CLES Backend
In your CLES backend terminal, you should see:
- Successful POST requests to `/api/ingest/hr`
- Data being stored in the database

## 📊 Expected Output

### Serial Monitor:
```
CLES Heart Rate Sensor - Step 3: WiFi Integration
==================================================
Connecting to WiFi: YOUR_WIFI_SSID
..........
WiFi connected!
IP address: 192.168.1.150
Server URL: http://192.168.1.100:3000/api/ingest/hr

Available Commands:
  STATUS           - Show sensor status
  GET_DATA         - Get latest BPM and IBI
  CALIBRATE        - Run sensor calibration
  START_SESSION:N  - Start session with ID N
  STOP_SESSION     - Stop current session
  HELP             - Show help message

> START_SESSION:12345
Session started: 12345
Heart rate data will be sent to CLES backend

Heart Beat! IBI: 812ms, BPM: 74
Sending HR data: {"sessionId":12345,"ts":5000,"ibi_ms":812,"bpm":74}
Response code: 200

Heart Beat! IBI: 834ms, BPM: 72
Sending HR data: {"sessionId":12345,"ts":6000,"ibi_ms":834,"bpm":72}
Response code: 200
```

### OLED Display:
- Shows BPM in large numbers
- Shows session status: `S:12345 W` (S=Session ID, W=WiFi connected)
- Or shows IBI when no session active

## 🔧 Troubleshooting

### WiFi Connection Failed
**Problem:** Can't connect to WiFi
**Solutions:**
- Check SSID and password spelling
- Ensure ESP32 and computer are on same network (2.4GHz)
- Move closer to router
- Check router settings (firewall, MAC filtering)

### Server Connection Failed
**Problem:** HTTP errors when sending data
**Solutions:**
- Verify server URL is correct
- Check CLES backend is running (`npm run dev` in `cles` folder)
- Ensure port 3000 is not blocked by firewall
- Check computer IP address hasn't changed

### No Data Received
**Problem:** Data sent but not received by backend
**Solutions:**
- Check backend console for errors
- Verify `/api/ingest/hr` endpoint exists
- Check database connection
- Review network logs

### Session Not Starting
**Problem:** `START_SESSION` command doesn't work
**Solutions:**
- Check command format: `START_SESSION:12345` (with colon)
- Verify session ID is a number
- Check Serial Monitor for error messages

## 📋 Test Checklist

After uploading Step 3 firmware:

- [ ] WiFi connects successfully
- [ ] IP address is displayed
- [ ] Server URL is correct
- [ ] `STATUS` command works
- [ ] `START_SESSION:12345` starts session
- [ ] Heart beat detected
- [ ] Data sent to backend (HTTP 200)
- [ ] Backend receives data
- [ ] OLED shows session status
- [ ] `STOP_SESSION` stops session

## 🎯 Integration with CLES

### How It Works:
1. **Session Start**: CLES creates a session, gets session ID
2. **ESP32 Start**: Send `START_SESSION:{id}` to ESP32
3. **Data Collection**: ESP32 sends heart rate data every second
4. **Backend Storage**: CLES stores data in `hr_beats` table
5. **Session End**: CLES processes HRV metrics
6. **Reports**: Display HRV analysis in reports

### Data Flow:
```
ESP32 → /api/ingest/hr → CLES Backend → Database (hr_beats)
                                                   ↓
                                         HRV Processing
                                                   ↓
                                         Reports Display
```

## 📊 Next Steps

Once Step 3 works:
1. ✅ WiFi connection established
2. ✅ Data sent to backend successfully
3. ✅ Backend receives and stores data
4. ✅ Session management working

**You're ready to integrate with CLES sessions!**

The ESP32 will now:
- Send heart rate data during CLES sessions
- Store IBI data for HRV analysis
- Display real-time HR sparkline in CLES
- Generate HRV reports after sessions

## 🎉 Success!

If you see:
- ✅ WiFi connected
- ✅ Data sending successfully
- ✅ HTTP 200 responses
- ✅ Backend receiving data

**Congratulations! Your ESP32 + SEN-11574 is fully integrated with CLES!**
