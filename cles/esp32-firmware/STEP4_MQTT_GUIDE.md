# 🚀 Step 4: MQTT Integration - Much Faster!

## Why MQTT is Better

**HTTP Problems:**
- ❌ Blocking requests (2-10 second delays)
- ❌ Interferes with heart rate detection
- ❌ Causes LED to stop blinking
- ❌ Serial Plotter shows flat lines

**MQTT Benefits:**
- ✅ **Non-blocking** - No delays
- ✅ **Real-time** - Instant transmission
- ✅ **Lightweight** - Minimal overhead
- ✅ **Reliable** - Built-in retry mechanisms
- ✅ **Preserves timing** - Heart rate detection works perfectly

## 🛠️ Setup MQTT Broker

### Option 1: Mosquitto (Recommended)
**Windows:**
```bash
# Download from: https://mosquitto.org/download/
# Or use Chocolatey:
choco install mosquitto

# Start broker:
mosquitto -v
```

**Mac:**
```bash
brew install mosquitto
mosquitto -v
```

**Linux:**
```bash
sudo apt install mosquitto mosquitto-clients
sudo systemctl start mosquitto
```

### Option 2: Docker (Easiest)
```bash
docker run -it -p 1883:1883 eclipse-mosquitto
```

## ⚙️ ESP32 Configuration

### 1. Install MQTT Library
In Arduino IDE:
1. Go to **Tools** → **Manage Libraries**
2. Search for **"PubSubClient"**
3. Install by **Nick O'Leary**

### 2. Update Configuration
Edit these lines in `step4_mqtt_integration.ino`:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100";  // Your computer's IP
```

### 3. Upload Firmware
Upload `step4_mqtt_integration.ino` to ESP32

## 🧪 Testing MQTT

### 1. Start MQTT Broker
```bash
mosquitto -v
```

### 2. Monitor MQTT Messages
In a separate terminal:
```bash
mosquitto_sub -h localhost -t "cles/hr/data"
```

### 3. Test ESP32
1. Upload firmware
2. Open Serial Monitor (115200 baud)
3. Send: `START_SESSION:12345`
4. Watch MQTT messages appear instantly!

### Expected Output

**Serial Monitor:**
```
WiFi connected!
IP address: 192.168.1.150
MQTT Server: 192.168.1.100
Attempting MQTT connection...
MQTT connected!

> START_SESSION:12345
Session started: 12345
Heart rate data will be sent via MQTT

Heart Beat! IBI: 812ms, BPM: 74
Sending HR data via MQTT: {"sessionId":12345,"ts":5000,"ibi_ms":812,"bpm":74}
Heart Beat! IBI: 834ms, BPM: 72
```

**MQTT Monitor:**
```json
{"sessionId":12345,"ts":5000,"ibi_ms":812,"bpm":74}
{"sessionId":12345,"ts":6000,"ibi_ms":834,"bpm":72}
{"sessionId":12345,"ts":7000,"ibi_ms":798,"bpm":75}
```

## 🔧 CLES Backend Integration

### 1. Install MQTT Client
```bash
cd cles
npm install mqtt
```

### 2. Create MQTT Receiver
Create `cles/src/lib/mqttReceiver.ts`:
```typescript
import mqtt from 'mqtt';
import { DatabaseClient } from './database';

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPIC = 'cles/hr/data';

let client: mqtt.MqttClient | null = null;

export function startMQTTReceiver() {
  if (client) return; // Already started
  
  client = mqtt.connect(MQTT_BROKER);
  
  client.on('connect', () => {
    console.log('MQTT connected to broker');
    client!.subscribe(MQTT_TOPIC);
  });
  
  client.on('message', async (topic, message) => {
    if (topic === MQTT_TOPIC) {
      try {
        const data = JSON.parse(message.toString());
        const { sessionId, ts, ibi_ms, bpm } = data;
        
        // Store HR beat data
        await DatabaseClient.createHRBeat({
          session_id: String(sessionId),
          ts_ms: Number(ts),
          ibi_ms: Number(ibi_ms),
          bpm: Number(bpm)
        });
        
        console.log(`HR data stored: Session ${sessionId}, BPM ${bpm}`);
      } catch (error) {
        console.error('Error processing MQTT HR data:', error);
      }
    }
  });
}

export function stopMQTTReceiver() {
  if (client) {
    client.end();
    client = null;
  }
}
```

### 3. Start MQTT Receiver
Add to your CLES startup:
```typescript
import { startMQTTReceiver } from '@/lib/mqttReceiver';

// Start MQTT receiver when app starts
startMQTTReceiver();
```

## 📊 Performance Comparison

| Method | Delay | Blocking | Heart Rate Detection |
|--------|-------|----------|-------------------|
| HTTP   | 2-10s | Yes      | ❌ Broken         |
| MQTT   | <1ms  | No       | ✅ Perfect         |

## 🎯 Expected Results

With MQTT you should see:
- ✅ **LED blinks normally** during sessions
- ✅ **Serial Plotter shows real-time data** (not flat lines)
- ✅ **BPM values > 0** during sessions
- ✅ **IBI in normal range** (600-1200ms)
- ✅ **No lag or delays**
- ✅ **Instant data transmission**

## 🚨 Troubleshooting

### MQTT Connection Failed
- Check broker is running: `mosquitto -v`
- Verify IP address in ESP32 code
- Check firewall allows port 1883

### No Data Received
- Monitor MQTT: `mosquitto_sub -t "cles/hr/data"`
- Check ESP32 Serial Monitor for errors
- Verify CLES backend MQTT receiver is running

### Still Getting Lag
- Make sure you're using `step4_mqtt_integration.ino`
- Check MQTT broker performance
- Verify WiFi signal strength

## 🎉 Success!

If you see:
- ✅ MQTT connected
- ✅ LED blinking during sessions
- ✅ Real-time BPM data
- ✅ No delays or lag

**Congratulations! Your ESP32 now has lightning-fast, non-blocking heart rate transmission!**

The heart rate detection will work perfectly during sessions, and data will be transmitted instantly via MQTT.
