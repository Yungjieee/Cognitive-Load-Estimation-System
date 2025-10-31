# 📊 Using Serial Monitor and Serial Plotter

## How to View Data

### Serial Monitor (Text Output)
**When to use:** To see detailed heartbeat information with IBI and BPM values

**How to open:**
1. Tools → Serial Monitor
2. Set baud rate to 115200
3. You'll see text output like:
   ```
   Heart Beat! IBI: 812ms, BPM: 74
   Heart Beat! IBI: 834ms, BPM: 72
   ```

**What you'll see:**
- Heartbeat events with timestamps
- IBI (Inter-Beat Interval) in milliseconds
- BPM (Beats Per Minute) calculated value
- Status messages

### Serial Plotter (Graph Visualization)
**When to use:** To visualize the pulse waveform and threshold

**How to open:**
1. Tools → Serial Plotter
2. Set baud rate to 115200
3. You'll see three lines:
   - **Yellow line**: Signal (raw pulse sensor data)
   - **Blue line**: Threshold (dynamic detection threshold)
   - **Green line**: BPM (current heart rate)

**What you'll see:**
- Pulse waveform (should show periodic peaks)
- Threshold line (adaptive threshold for detection)
- BPM spikes when heartbeat detected

## 📈 Understanding the Output

### Serial Monitor Output Format:
```
Heart Beat! IBI: 812ms, BPM: 74
Heart Beat! IBI: 834ms, BPM: 72
Heart Beat! IBI: 789ms, BPM: 76
```

**Explanation:**
- **IBI**: Time between consecutive heartbeats in milliseconds
- **BPM**: Beats per minute (60,000 ÷ IBI)
- Normal resting heart rate: 60-100 BPM
- Normal IBI: 600-1000ms

### Serial Plotter Output Format:
```
Signal,Threshold,BPM
```

**Three lines plotted:**
1. **Signal** (Yellow): Raw pulse sensor data - should show periodic waveform
2. **Threshold** (Blue): Dynamic detection threshold - should be above noise
3. **BPM** (Green): Shows spikes when heartbeat detected

## 🎯 What to Look For

### ✅ Good Signal (Healthy):
- **Serial Monitor**: Regular heartbeat messages every 0.6-1.0 seconds
- **Serial Plotter**: Clear periodic waveform with distinct peaks
- **BPM**: Consistent values between 60-100
- **OLED**: Shows steady BPM with LED blinking

### ❌ Poor Signal (Issues):
- **No heartbeat detected**: Check sensor contact
- **Erratic readings**: Wait for sensor to stabilize
- **BPM too high/low**: Adjust finger placement
- **Flat waveform**: Sensor not reading properly

## 🔧 Troubleshooting

### No Data in Serial Plotter:
- Make sure Serial Monitor is closed (can't use both at once)
- Check baud rate is 115200
- Verify sensor is connected and finger is placed

### No Heartbeat Detected:
- Ensure finger covers sensor LED completely
- Apply gentle, consistent pressure
- Keep finger still
- Check ambient lighting (avoid bright light)

### Erratic Readings:
- Wait 2-3 seconds for sensor to stabilize
- Try different finger positions
- Ensure good skin contact
- Check wiring connections

## 📊 Expected Values

### Normal Resting Heart Rate:
- **BPM**: 60-100 beats per minute
- **IBI**: 600-1000 milliseconds
- **Variation**: Small variations are normal

### Signal Quality Indicators:
- **Strong signal**: Clear peaks in Serial Plotter
- **Threshold**: Should be above noise but below peaks
- **Peak detection**: Should trigger at each heartbeat

## 🎨 Visual Guide

### Serial Monitor View:
```
CLES Heart Rate Sensor - Step 1: Basic Detection
================================================
Place your finger on the sensor
Watch for BPM on display and serial output

Heart Beat! IBI: 812ms, BPM: 74
Heart Beat! IBI: 834ms, BPM: 72
Heart Beat! IBI: 789ms, BPM: 76
```

### Serial Plotter View:
```
      Signal ──────────────┬───────────────┬───────────────
      Threshold ────────────┴───────────────┴───────────────
      BPM ────────────────────────────────────────────────
      
      (Peaks indicate heartbeats detected)
```

## 💡 Tips for Best Results

1. **Keep finger still** during measurement
2. **Apply consistent pressure** - not too tight, not too loose
3. **Cover sensor LED completely** with finger
4. **Wait for stabilization** - takes 2-3 seconds
5. **Avoid bright ambient light** - can interfere with sensor
6. **Use Serial Plotter** to visualize signal quality
7. **Use Serial Monitor** to see exact values

## 📝 Next Steps

Once you see stable readings:
1. ✅ Heartbeat detected regularly
2. ✅ BPM between 60-100 (resting)
3. ✅ IBI between 600-1000ms
4. ✅ LED blinking with heartbeat
5. ✅ OLED showing BPM

Then we can move to **Step 2: Serial Communication** and **Step 3: WiFi Integration**!
