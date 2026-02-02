import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { Detection } from '../types/dart';

export class DartDetectionService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isInitialized = false;
  private dartboardCenter: { x: number; y: number } | null = null;
  private dartboardRadius: number = 0;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await tf.ready();
      this.model = await cocoSsd.load();
      this.isInitialized = true;
      console.log('Dart detection model loaded successfully');
    } catch (error) {
      console.error('Failed to load detection model:', error);
      throw error;
    }
  }

  // Auto-detect dartboard in the camera feed
  autoDetectDartboard(canvas: HTMLCanvasElement): { centerX: number; centerY: number; radius: number } | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and find edges
    const edges: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      edges.push(gray);
    }

    // Find the brightest/most prominent circular region
    // Look for the center of the image as a starting point
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Try different radii to find the best fit
    let bestRadius = 0;
    let maxScore = 0;

    const minRadius = Math.min(canvas.width, canvas.height) * 0.15;
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;

    for (let r = minRadius; r <= maxRadius; r += 5) {
      let score = 0;
      const samples = 36; // Sample 36 points around the circle

      for (let angle = 0; angle < 360; angle += 360 / samples) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(centerX + r * Math.cos(rad));
        const y = Math.round(centerY + r * Math.sin(rad));

        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
          const idx = y * canvas.width + x;
          
          // Check for edge-like features (color transitions)
          const neighbors = [
            idx - 1,
            idx + 1,
            idx - canvas.width,
            idx + canvas.width
          ].filter(i => i >= 0 && i < edges.length);

          const gradientSum = neighbors.reduce((sum, nidx) => {
            return sum + Math.abs(edges[idx] - edges[nidx]);
          }, 0);

          score += gradientSum;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestRadius = r;
      }
    }

    // If we found a reasonable circle
    if (bestRadius > minRadius && maxScore > 1000) {
      return {
        centerX,
        centerY,
        radius: bestRadius
      };
    }

    // Fallback: use default proportions
    return {
      centerX: canvas.width / 2,
      centerY: canvas.height / 2,
      radius: Math.min(canvas.width, canvas.height) / 3
    };
  }

  async detectDarts(canvas: HTMLCanvasElement): Promise<Detection[]> {
    if (!this.model || !this.isInitialized) {
      console.warn('Model not initialized');
      return [];
    }

    try {
      const predictions = await this.model.detect(canvas);
      
      // Filter for objects that could be darts or the dartboard
      const detections: Detection[] = predictions
        .filter(pred => 
          pred.class === 'sports ball' || 
          pred.class === 'frisbee' ||
          pred.class === 'knife' ||
          pred.score > 0.3
        )
        .map(pred => ({
          bbox: pred.bbox,
          class: pred.class,
          score: pred.score
        }));

      return detections;
    } catch (error) {
      console.error('Detection error:', error);
      return [];
    }
  }

  // Calibrate dartboard position and size
  calibrateDartboard(_canvas: HTMLCanvasElement, centerX: number, centerY: number, radius: number): void {
    this.dartboardCenter = { x: centerX, y: centerY };
    this.dartboardRadius = radius;
  }

  // Calculate dart score based on position relative to dartboard
  calculateScore(dartX: number, dartY: number): { score: number; multiplier: number } {
    if (!this.dartboardCenter || !this.dartboardRadius) {
      return { score: 0, multiplier: 1 };
    }

    // Calculate distance from center
    const dx = dartX - this.dartboardCenter.x;
    const dy = dartY - this.dartboardCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalizedDistance = distance / this.dartboardRadius;

    // Calculate angle (0-360 degrees)
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    // Adjust angle so 0 degrees is at top (12 o'clock position)
    angle = (angle + 90) % 360;

    // Determine which segment (1-20) based on angle
    // Standard dartboard: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
    const segments = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
    const segmentIndex = Math.floor(angle / 18); // 360 / 20 = 18 degrees per segment
    const segmentScore = segments[segmentIndex % 20];

    // Determine multiplier based on distance from center
    if (normalizedDistance <= 0.06) {
      // Double bull (inner bull)
      return { score: 50, multiplier: 1 };
    } else if (normalizedDistance <= 0.12) {
      // Single bull (outer bull)
      return { score: 25, multiplier: 1 };
    } else if (normalizedDistance > 0.95 && normalizedDistance <= 1.05) {
      // Double ring (outer ring)
      return { score: segmentScore, multiplier: 2 };
    } else if (normalizedDistance > 0.55 && normalizedDistance <= 0.65) {
      // Triple ring
      return { score: segmentScore, multiplier: 3 };
    } else if (normalizedDistance <= 0.95) {
      // Single area
      return { score: segmentScore, multiplier: 1 };
    } else {
      // Outside dartboard
      return { score: 0, multiplier: 1 };
    }
  }

  // Draw dartboard overlay on canvas
  drawDartboard(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
    // Save dartboard position for score calculation
    this.dartboardCenter = { x: centerX, y: centerY };
    this.dartboardRadius = radius;

    // Draw dartboard circles
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
    ctx.lineWidth = 2;

    // Outer double ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Triple ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.stroke();

    // Outer bull
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.12, 0, 2 * Math.PI);
    ctx.stroke();

    // Inner bull
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.06, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw segment lines
    for (let i = 0; i < 20; i++) {
      const angle = (i * 18 - 90) * (Math.PI / 180);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  // Draw detection boxes
  drawDetections(ctx: CanvasRenderingContext2D, detections: Detection[]): void {
    detections.forEach(detection => {
      const [x, y, width, height] = detection.bbox;
      
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      ctx.fillStyle = '#00ff00';
      ctx.font = '16px Arial';
      ctx.fillText(
        `${detection.class} (${(detection.score * 100).toFixed(0)}%)`,
        x,
        y > 10 ? y - 5 : 10
      );
    });
  }
}

export const dartDetectionService = new DartDetectionService();
