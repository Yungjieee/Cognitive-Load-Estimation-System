// Live streams monitoring system for CLES sessions
// Handles webcam attention monitoring

import { eventLogger } from './eventLogger';

export interface StreamStatus {
  webcam: {
    active: boolean;
    faceDetected: boolean;
    error?: string;
  };
}

export interface AttentionData {
  timestamp: number;
  faceDetected: boolean;
  attentionScore: number; // 0-1, simplified proxy for attention
}

class LiveStreamsManager {
  private attentionData: AttentionData[] = [];
  private status: StreamStatus = {
    webcam: { active: false, faceDetected: false }
  };
  private pythonStatusInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private pythonBackendUrl = 'http://localhost:5001';

  // Initialize streams
  async initialize(): Promise<StreamStatus> {
    if (this.isInitialized) {
      return this.status;
    }

    try {
      // Try to initialize webcam
      await this.initializeWebcam();
    } catch (error) {
      console.warn('Webcam initialization failed:', error);
      this.status.webcam.error = 'Webcam not available';
    }

    this.isInitialized = true;
    return this.status;
  }

  // Initialize webcam stream (now handled by Python backend)
  private async initializeWebcam(): Promise<void> {
    try {
      // Check if Python backend is available
      const response = await fetch(`${this.pythonBackendUrl}/health`);
      if (response.ok) {
        this.status.webcam.active = true;
        this.status.webcam.error = undefined;

        // Start polling Python backend for face detection status
        this.pollPythonStatus();
      } else {
        throw new Error('Python backend not responding');
      }
    } catch (error) {
      this.status.webcam.active = false;
      this.status.webcam.error = 'Python backend not available. Run: python attention_server.py';
      throw error;
    }
  }

  // Poll Python backend for attention status
  private pollPythonStatus(): void {
    const pollStatus = async () => {
      try {
        const response = await fetch(`${this.pythonBackendUrl}/status`);
        if (response.ok) {
          const data = await response.json();
          const status = data.status as string;

          // Update face detection based on Python backend status
          // 'FOCUSED' means face detected, 'DISTRACTED' means no face
          const faceDetected = status === 'FOCUSED';
          this.status.webcam.faceDetected = faceDetected;

          // Record attention data
          this.recordAttentionData(faceDetected);

          // Mark webcam as active if we got a response
          if (!this.status.webcam.active) {
            this.status.webcam.active = true;
            this.status.webcam.error = undefined;
          }
        } else {
          // Backend responded but with an error
          this.status.webcam.active = false;
          this.status.webcam.error = 'Python backend error';
        }
      } catch (error) {
        // Connection failed
        this.status.webcam.active = false;
        this.status.webcam.faceDetected = false;
        this.status.webcam.error = 'Cannot connect to Python backend';
      }
    };

    // Poll immediately
    pollStatus();

    // Then poll every 500ms for real-time updates
    this.pythonStatusInterval = setInterval(pollStatus, 500);
  }

  // Record attention data
  private recordAttentionData(faceDetected: boolean, attentionScore?: number): void {
    const dataPoint: AttentionData = {
      timestamp: Date.now(),
      faceDetected,
      attentionScore: attentionScore ?? (faceDetected ? 0.8 : 0.2)
    };

    this.attentionData.push(dataPoint);

    // Keep only last 60 seconds of data
    const cutoff = Date.now() - 60000;
    this.attentionData = this.attentionData.filter(point => point.timestamp > cutoff);
  }

  // Get current status
  getStatus(): StreamStatus {
    return { ...this.status };
  }

  // Get webcam stream for video elements (not used with Python backend)
  getWebcamStream(): MediaStream | null {
    return null;
  }

  // Get attention data
  getAttentionData(): AttentionData[] {
    return [...this.attentionData];
  }

  // Check if face is currently detected
  isFaceDetected(): boolean {
    return this.status.webcam.faceDetected;
  }

  // Get average attention over last N seconds
  getAverageAttention(seconds: number = 10): number {
    const cutoff = Date.now() - (seconds * 1000);
    const recentData = this.attentionData.filter(point => point.timestamp > cutoff);

    if (recentData.length === 0) return 0.5;

    const sum = recentData.reduce((acc, point) => acc + point.attentionScore, 0);
    return sum / recentData.length;
  }

  // Cleanup resources
  cleanup(): void {
    // Clear intervals
    if (this.pythonStatusInterval) {
      clearInterval(this.pythonStatusInterval);
      this.pythonStatusInterval = null;
    }

    // Reset status
    this.status = {
      webcam: { active: false, faceDetected: false }
    };

    this.isInitialized = false;
  }

  // Get stream health summary
  getHealthSummary(): {
    webcamHealthy: boolean;
    overallHealthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!this.status.webcam.active) {
      issues.push('Webcam not available');
    }

    if (this.status.webcam.error) {
      issues.push(`Webcam: ${this.status.webcam.error}`);
    }

    const webcamHealthy = this.status.webcam.active && !this.status.webcam.error;
    const overallHealthy = webcamHealthy;

    return {
      webcamHealthy,
      overallHealthy,
      issues
    };
  }
}

// Create a singleton instance
export const liveStreamsManager = new LiveStreamsManager();

// Export the class for testing
export { LiveStreamsManager };
