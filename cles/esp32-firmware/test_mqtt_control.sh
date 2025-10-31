#!/bin/bash
# Test script for MQTT control commands (Step 10)

SESSION_ID=${1:-15}
MQTT_BROKER=${2:-localhost}

echo "Testing MQTT control commands for Session $SESSION_ID"
echo "MQTT Broker: $MQTT_BROKER"
echo ""

# Test start command
echo "1. Sending START command..."
mosquitto_pub -h $MQTT_BROKER -t "cles/hr/$SESSION_ID/ctrl" -m '{"cmd":"start","sessionId":'$SESSION_ID'}'

echo "Waiting 5 seconds..."
sleep 5

# Test stop command
echo "2. Sending STOP command..."
mosquitto_pub -h $MQTT_BROKER -t "cles/hr/$SESSION_ID/ctrl" -m '{"cmd":"stop"}'

echo "Test complete!"
echo ""
echo "Check ESP32 Serial Monitor for:"
echo "- 'Remote start command for session: $SESSION_ID'"
echo "- 'Subscribed to control topic: cles/hr/$SESSION_ID/ctrl'"
echo "- 'Remote stop command received'"

