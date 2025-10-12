// Live streams monitoring system for CLES sessions
// Handles webcam and heart rate monitoring with mock data fallback

import { MOCK_HR_BASE, MOCK_HR_NOISE } from './constants';
import { eventLogger } from './eventLogger';

export interface StreamStatus {
  webcam: {
    active: boolean;
    faceDetected: boolean;
    error?: string;
  };
  hr: {
    active: boolean;
    bpm: number;
    error?: string;
  };
}

export interface HRDataPoint {
  timestamp: number;
  bpm: number;
}

export interface AttentionData {
  timestamp: number;
  faceDetected: boolean;
  attentionScore: number; // 0-1, simplified proxy for attention
}

class LiveStreamsManager {
  private webcamStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private hrData: HRDataPoint[] = [];
  private attentionData: AttentionData[] = [];
  private status: StreamStatus = {
    webcam: { active: false, faceDetected: false },
    hr: { active: false, bpm: MOCK_HR_BASE }
  };
  private mockHRInterval: NodeJS.Timeout | null = null;
  private mockAttentionInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Initialize streams
  async initialize(): Promise<StreamStatus> {
    if (this.isInitialized) {
      return this.status;
    }

    try {
      // Try to initialize webcam
      await this.initializeWebcam();
    } catch (error) {
      console.warn('Webcam initialization failed, using mock data:', error);
      this.status.webcam.error = 'Webcam not available';
    }

    // Initialize mock HR data
    this.initializeMockHR();
    
    // Initialize mock attention data
    this.initializeMockAttention();

    this.isInitialized = true;
    return this.status;
  }

  // Initialize webcam stream
  private async initializeWebcam(): Promise<void> {
    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 }
      });

      this.status.webcam.active = true;
      
      // Create video element for face detection (simplified)
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.webcamStream;
      this.videoElement.play();

      // Simple face detection simulation
      this.simulateFaceDetection();
      
    } catch (error) {
      this.status.webcam.active = false;
      this.status.webcam.error = 'Permission denied or device not available';
      throw error;
    }
  }

  // Simulate face detection (in real implementation, this would use ML models)
  private simulateFaceDetection(): void {
    if (!this.videoElement) return;

    const checkFace = () => {
      // Simulate face detection with some randomness
      const faceDetected = Math.random() > 0.1; // 90% of the time face is detected
      this.status.webcam.faceDetected = faceDetected;
      
      // Record attention data
      this.recordAttentionData(faceDetected);
      
      // Schedule next check
      setTimeout(checkFace, 1000); // Check every second
    };

    checkFace();
  }

  // Initialize mock HR data generation
  private initializeMockHR(): void {
    this.status.hr.active = true;
    
    this.mockHRInterval = setInterval(() => {
      // Generate realistic HR data with occasional spikes
      const baseHR = MOCK_HR_BASE;
      const noise = (Math.random() - 0.5) * MOCK_HR_NOISE;
      const spike = Math.random() < 0.05 ? (Math.random() - 0.5) * 20 : 0; // 5% chance of spike
      
      const bpm = Math.max(60, Math.min(120, baseHR + noise + spike));
      
      this.recordHRData(bpm);
    }, 1000); // Update every second
  }

  // Initialize mock attention data
  private initializeMockAttention(): void {
    this.mockAttentionInterval = setInterval(() => {
      // Generate attention data based on face detection and some randomness
      const faceDetected = this.status.webcam.faceDetected;
      const baseAttention = faceDetected ? 0.8 : 0.2;
      const noise = (Math.random() - 0.5) * 0.3;
      const attentionScore = Math.max(0, Math.min(1, baseAttention + noise));
      
      this.recordAttentionData(faceDetected, attentionScore);
    }, 2000); // Update every 2 seconds
  }

  // Record HR data point
  private recordHRData(bpm: number): void {
    const dataPoint: HRDataPoint = {
      timestamp: Date.now(),
      bpm: Math.round(bpm)
    };

    this.hrData.push(dataPoint);
    this.status.hr.bpm = Math.round(bpm);

    // Keep only last 90 seconds of data
    const cutoff = Date.now() - 90000;
    this.hrData = this.hrData.filter(point => point.timestamp > cutoff);
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

  // Get webcam stream for video elements
  getWebcamStream(): MediaStream | null {
    return this.webcamStream;
  }

  // Get HR sparkline data (last 60-90 seconds)
  getHRSparkline(): HRDataPoint[] {
    return [...this.hrData];
  }

  // Get attention data
  getAttentionData(): AttentionData[] {
    return [...this.attentionData];
  }

  // Get current HR
  getCurrentHR(): number {
    return this.status.hr.bpm;
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

  // Check if user needs rest (simplified heuristic)
  needsRest(): boolean {
    const recentAttention = this.getAverageAttention(5);
    const faceDetected = this.isFaceDetected();
    
    // Suggest rest if attention is low and face not detected
    return recentAttention < 0.3 && !faceDetected;
  }

  // Check if user is struggling (for hint suggestions)
  isStruggling(): boolean {
    const recentAttention = this.getAverageAttention(10);
    const hrVariability = this.getHRVariability();
    
    // User is struggling if attention is fluctuating and HR is variable
    return recentAttention < 0.5 && hrVariability > 10;
  }

  // Get HR variability (standard deviation)
  private getHRVariability(): number {
    if (this.hrData.length < 5) return 0;
    
    const recentHR = this.hrData.slice(-10).map(point => point.bpm);
    const mean = recentHR.reduce((sum, bpm) => sum + bpm, 0) / recentHR.length;
    const variance = recentHR.reduce((sum, bpm) => sum + Math.pow(bpm - mean, 2), 0) / recentHR.length;
    
    return Math.sqrt(variance);
  }

  // Cleanup resources
  cleanup(): void {
    // Stop webcam stream
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }

    // Clear intervals
    if (this.mockHRInterval) {
      clearInterval(this.mockHRInterval);
      this.mockHRInterval = null;
    }

    if (this.mockAttentionInterval) {
      clearInterval(this.mockAttentionInterval);
      this.mockAttentionInterval = null;
    }

    // Reset status
    this.status = {
      webcam: { active: false, faceDetected: false },
      hr: { active: false, bpm: MOCK_HR_BASE }
    };

    this.isInitialized = false;
  }

  // Get stream health summary
  getHealthSummary(): {
    webcamHealthy: boolean;
    hrHealthy: boolean;
    overallHealthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    if (!this.status.webcam.active) {
      issues.push('Webcam not available');
    }
    
    if (!this.status.hr.active) {
      issues.push('Heart rate monitoring not available');
    }
    
    if (this.status.webcam.error) {
      issues.push(`Webcam: ${this.status.webcam.error}`);
    }
    
    if (this.status.hr.error) {
      issues.push(`HR: ${this.status.hr.error}`);
    }

    const webcamHealthy = this.status.webcam.active && !this.status.webcam.error;
    const hrHealthy = this.status.hr.active && !this.status.hr.error;
    const overallHealthy = webcamHealthy && hrHealthy;

    return {
      webcamHealthy,
      hrHealthy,
      overallHealthy,
      issues
    };
  }
}

// Create a singleton instance
export const liveStreamsManager = new LiveStreamsManager();

// Export the class for testing
export { LiveStreamsManager };
