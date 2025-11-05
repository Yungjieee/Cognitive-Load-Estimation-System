from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import time

app = Flask(__name__)
# Enable CORS to allow Next.js to access this Flask app
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:3001"]}})

class AttentionTrackerWeb:
    def __init__(self):
        # Load pre-trained face detection model
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

        # Initialize webcam
        self.cap = cv2.VideoCapture(0)

        # Attention tracking variables
        self.no_face_time = 0
        self.last_time = time.time()
        self.distraction_threshold = 2  # seconds without face detection = distracted
        self.current_status = 'FOCUSED'

    def detect_attention(self, frame):
        """
        Detects if the person is focused or distracted based on face and eye detection.
        Returns: 'FOCUSED' or 'DISTRACTED', and the processed frame
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        current_time = time.time()
        time_delta = current_time - self.last_time
        self.last_time = current_time

        if len(faces) > 0:
            # Face detected - check for eyes as additional focus indicator
            for (x, y, w, h) in faces:
                roi_gray = gray[y:y+h, x:x+w]
                roi_color = frame[y:y+h, x:x+w]

                # Detect eyes within face region
                eyes = self.eye_cascade.detectMultiScale(roi_gray)

                # Draw rectangle around face
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

                # Draw rectangles around eyes
                for (ex, ey, ew, eh) in eyes:
                    cv2.rectangle(roi_color, (ex, ey), (ex+ew, ey+eh), (0, 255, 255), 2)

                # If face is detected, reset distraction timer
                self.no_face_time = 0
                self.current_status = 'FOCUSED'

        else:
            # No face detected - increment distraction time
            self.no_face_time += time_delta

            if self.no_face_time >= self.distraction_threshold:
                self.current_status = 'DISTRACTED'

        # Add status overlay to frame
        if self.current_status == 'FOCUSED':
            color = (0, 255, 0)  # Green
            text = "STATUS: FOCUSED"
        else:
            color = (0, 0, 255)  # Red
            text = "STATUS: DISTRACTED"

        cv2.putText(frame, text, (10, 50),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, color, 3)

        return self.current_status, frame

    def get_frame(self):
        """
        Get a single frame from webcam with attention detection
        """
        ret, frame = self.cap.read()
        if not ret:
            return None, None

        status, processed_frame = self.detect_attention(frame)

        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', processed_frame)
        frame_bytes = buffer.tobytes()

        return status, frame_bytes

    def release(self):
        """Release the webcam"""
        self.cap.release()

# Global tracker instance
tracker = AttentionTrackerWeb()

@app.route('/status')
def get_status():
    """API endpoint to get current attention status"""
    return jsonify({'status': tracker.current_status})

def generate_frames():
    """Generator function to stream video frames"""
    while True:
        status, frame = tracker.get_frame()
        if frame is None:
            break

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Attention Tracker Server Running'})

if __name__ == '__main__':
    try:
        print("=" * 60)
        print("🎯 CLES Attention Tracker Server Starting...")
        print("=" * 60)
        print("📡 Server running on: http://localhost:5001")
        print("📹 Video feed: http://localhost:5001/video_feed")
        print("📊 Status API: http://localhost:5001/status")
        print("=" * 60)
        app.run(host='0.0.0.0', port=5001, debug=True, threaded=True)
    finally:
        tracker.release()
