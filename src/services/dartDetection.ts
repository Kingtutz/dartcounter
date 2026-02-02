import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { Detection } from '../types/dart';

export class DartDetectionService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isInitialized = false;
  private dartboardCenter: { x: number; y: number } | null = null;
  private dartboardRadius: number = 0;
  private previousFrame: ImageData | null = null;
  private detectionCallback: ((score: number, multiplier: number) => void) | null = null;

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

  // Set callback for automatic dart detection
  setDetectionCallback(callback: (score: number, multiplier: number) => void): void {
    this.detectionCallback = callback;
  }

  // Detect dart impact using frame difference
  detectDartImpact(canvas: HTMLCanvasElement): void {
    if (!this.dartboardCenter || !this.dartboardRadius) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // If we have a previous frame, compare them
    if (this.previousFrame) {
      const changes = this.detectFrameChanges(this.previousFrame, currentFrame);
      
      // Filter changes to only those within the dartboard area
      const dartboardChanges = changes.filter(point => {
        const dx = point.x - this.dartboardCenter!.x;
        const dy = point.y - this.dartboardCenter!.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.dartboardRadius!;
      });

      // If we detected a significant change in the dartboard area
      if (dartboardChanges.length > 50 && dartboardChanges.length < 1000) {
        // Find the center of the changes (approximate dart position)
        const avgX = dartboardChanges.reduce((sum, p) => sum + p.x, 0) / dartboardChanges.length;
        const avgY = dartboardChanges.reduce((sum, p) => sum + p.y, 0) / dartboardChanges.length;

        // Calculate score based on position
        const result = this.calculateScore(avgX, avgY);
        
        // Call the callback if set
        if (this.detectionCallback && result.score > 0) {
          console.log(`Auto-detected dart at (${avgX.toFixed(0)}, ${avgY.toFixed(0)}): ${result.multiplier > 1 ? (result.multiplier === 2 ? 'D' : 'T') : ''}${result.score}`);
          this.detectionCallback(result.score, result.multiplier);
        }
      }
    }

    // Store current frame for next comparison
    this.previousFrame = currentFrame;
  }

  // Detect changes between two frames
  private detectFrameChanges(prevFrame: ImageData, currentFrame: ImageData): Array<{x: number, y: number}> {
    const changes: Array<{x: number, y: number}> = [];
    const threshold = 30; // Sensitivity threshold
    const width = prevFrame.width;

    for (let i = 0; i < prevFrame.data.length; i += 4) {
      const rDiff = Math.abs(prevFrame.data[i] - currentFrame.data[i]);
      const gDiff = Math.abs(prevFrame.data[i + 1] - currentFrame.data[i + 1]);
      const bDiff = Math.abs(prevFrame.data[i + 2] - currentFrame.data[i + 2]);
      
      const totalDiff = rDiff + gDiff + bDiff;
      
      if (totalDiff > threshold) {
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        changes.push({ x, y });
      }
    }

    return changes;
  }

  // Reset frame comparison
  resetFrameComparison(): void {
    this.previousFrame = null;
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

  // Auto-detect dartboard in the camera feed
  autoDetectDartboard(canvas: HTMLCanvasElement): { centerX: number; centerY: number; radius: number } | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Look for circular regions with high contrast (dartboard has black/white/red/green)
    const width = canvas.width;
    const height = canvas.height;
    
    // Create a simplified color map looking for dartboard colors
    const colorScore: number[] = new Array(width * height).fill(0);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Look for dartboard colors: dark (black), light (white/cream), red, green
      const isDark = r < 80 && g < 80 && b < 80;
      const isLight = r > 200 && g > 200 && b > 200;
      const isRed = r > 150 && g < 100 && b < 100;
      const isGreen = r < 100 && g > 120 && b < 100;
      
      if (isDark || isLight || isRed || isGreen) {
        colorScore[i / 4] = 1;
      }
    }

    // Find regions with high density of dartboard colors
    let bestCenterX = width / 2;
    let bestCenterY = height / 2;
    let bestScore = 0;
    
    // Sample potential center points
    const sampleStep = 20;
    for (let cy = height * 0.2; cy < height * 0.8; cy += sampleStep) {
      for (let cx = width * 0.2; cx < width * 0.8; cx += sampleStep) {
        let score = 0;
        const testRadius = Math.min(width, height) * 0.25;
        
        // Count dartboard-colored pixels in a circle around this point
        for (let angle = 0; angle < 360; angle += 10) {
          const rad = (angle * Math.PI) / 180;
          const x = Math.round(cx + testRadius * Math.cos(rad));
          const y = Math.round(cy + testRadius * Math.sin(rad));
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = y * width + x;
            score += colorScore[idx];
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestCenterX = cx;
          bestCenterY = cy;
        }
      }
    }

    // Refine radius by testing different sizes
    let bestRadius = 0;
    let maxRadiusScore = 0;
    const minRadius = Math.min(width, height) * 0.15;
    const maxRadius = Math.min(width, height) * 0.45;

    for (let r = minRadius; r <= maxRadius; r += 3) {
      let score = 0;
      const samples = 36;

      for (let angle = 0; angle < 360; angle += 360 / samples) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(bestCenterX + r * Math.cos(rad));
        const y = Math.round(bestCenterY + r * Math.sin(rad));

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = y * width + x;
          score += colorScore[idx];
          
          // Also check inner and outer rings for better detection
          const innerR = r * 0.8;
          const xi = Math.round(bestCenterX + innerR * Math.cos(rad));
          const yi = Math.round(bestCenterY + innerR * Math.sin(rad));
          if (xi >= 0 && xi < width && yi >= 0 && yi < height) {
            score += colorScore[yi * width + xi];
          }
        }
      }

      if (score > maxRadiusScore) {
        maxRadiusScore = score;
        bestRadius = r;
      }
    }

    // Only return if we found a reasonable detection
    if (bestScore > 5 && bestRadius > minRadius) {
      console.log(`Auto-detected dartboard: center(${Math.round(bestCenterX)}, ${Math.round(bestCenterY)}), radius: ${Math.round(bestRadius)}, score: ${bestScore}`);
      return {
        centerX: Math.round(bestCenterX),
        centerY: Math.round(bestCenterY),
        radius: Math.round(bestRadius)
      };
    }

    // Fallback: use center of frame with estimated radius
    console.log('Auto-detection fallback - using center of frame');
    return {
      centerX: Math.round(width / 2),
      centerY: Math.round(height / 2),
      radius: Math.round(Math.min(width, height) / 3)
    };
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
