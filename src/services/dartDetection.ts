import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { Detection } from '../types/dart';

export class DartDetectionService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isInitialized = false;
  private dartboardCenter: { x: number; y: number } | null = null;
  private dartboardRadiusX: number = 0;
  private dartboardRadiusY: number = 0;
  private dartboardRotation: number = 0;
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

  clearDetectionCallback(): void {
    this.detectionCallback = null;
  }

  calibrateDartboard(_canvas: HTMLCanvasElement, centerX: number, centerY: number, radius: number, radiusY?: number, rotation: number = 0): void {
    this.dartboardCenter = { x: centerX, y: centerY };
    this.dartboardRadiusX = radius;
    this.dartboardRadiusY = radiusY || radius;
    this.dartboardRotation = rotation;
    console.log(`Dartboard calibrated: center=(${centerX}, ${centerY}), radiusX=${radius}, radiusY=${this.dartboardRadiusY}, rotation=${(rotation * 180 / Math.PI).toFixed(1)}°`);
  }

  // Transform point from ellipse space to circle space for angle calculation
  private transformPoint(x: number, y: number): { x: number; y: number } {
    if (!this.dartboardCenter) return { x, y };

    const { x: centerX, y: centerY } = this.dartboardCenter;
    
    // Translate to origin
    let dx = x - centerX;
    let dy = y - centerY;
    
    // Rotate back by -rotation angle
    const cos = Math.cos(-this.dartboardRotation);
    const sin = Math.sin(-this.dartboardRotation);
    const rotX = dx * cos - dy * sin;
    const rotY = dx * sin + dy * cos;
    
    // Scale Y to make ellipse circular
    const scaleY = this.dartboardRadiusY > 0 ? this.dartboardRadiusX / this.dartboardRadiusY : 1;
    const circularY = rotY * scaleY;
    
    return { x: rotX, y: circularY };
  }

  calculateScore(x: number, y: number): { score: number; multiplier: number } {
    if (!this.dartboardCenter) {
      return { score: 0, multiplier: 1 };
    }

    // Transform the point to circular space
    const transformed = this.transformPoint(x, y);
    const distance = Math.sqrt(transformed.x ** 2 + transformed.y ** 2);
    const angle = Math.atan2(transformed.y, transformed.x);
    
    // Normalize distance relative to radiusX
    const normalizedDist = distance / this.dartboardRadiusX;

    // Check bulls-eye (inner bull - 50 points)
    if (normalizedDist < 0.04) {
      return { score: 50, multiplier: 1 };
    }

    // Check bull (outer bull - 25 points)
    if (normalizedDist < 0.07) {
      return { score: 25, multiplier: 1 };
    }

    // Outside dartboard
    if (normalizedDist > 1.0) {
      return { score: 0, multiplier: 1 };
    }

    // Determine segment (1-20)
    const dartboardSegments = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
    const segmentAngle = (angle + Math.PI + Math.PI / 20) % (Math.PI * 2);
    const segmentIndex = Math.floor(segmentAngle / (Math.PI * 2 / 20));
    const score = dartboardSegments[segmentIndex];

    // Determine multiplier based on distance
    // Triple ring: 0.58 - 0.65
    if (normalizedDist >= 0.58 && normalizedDist <= 0.65) {
      return { score, multiplier: 3 };
    }

    // Double ring: 0.95 - 1.0
    if (normalizedDist >= 0.95 && normalizedDist <= 1.0) {
      return { score, multiplier: 2 };
    }

    // Single
    return { score, multiplier: 1 };
  }

  async detectDarts(canvas: HTMLCanvasElement): Promise<Detection[]> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    try {
      const predictions = await this.model.detect(canvas);
      return predictions.map(pred => ({
        class: pred.class,
        score: pred.score,
        bbox: pred.bbox
      }));
    } catch (error) {
      console.error('Detection error:', error);
      return [];
    }
  }

  // Detect dart impact by comparing frames
  detectDartImpact(canvas: HTMLCanvasElement): { x: number; y: number } | null {
    if (!this.dartboardCenter) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (!this.previousFrame) {
      this.previousFrame = currentFrame;
      return null;
    }

    // Calculate difference
    let maxDiff = 0;
    let maxDiffX = 0;
    let maxDiffY = 0;
    
    const { x: centerX, y: centerY } = this.dartboardCenter;
    const searchRadius = Math.max(this.dartboardRadiusX, this.dartboardRadiusY) * 1.2;

    for (let y = Math.max(0, centerY - searchRadius); y < Math.min(canvas.height, centerY + searchRadius); y += 2) {
      for (let x = Math.max(0, centerX - searchRadius); x < Math.min(canvas.width, centerX + searchRadius); x += 2) {
        const idx = (y * canvas.width + x) * 4;
        
        const rDiff = Math.abs(currentFrame.data[idx] - this.previousFrame.data[idx]);
        const gDiff = Math.abs(currentFrame.data[idx + 1] - this.previousFrame.data[idx + 1]);
        const bDiff = Math.abs(currentFrame.data[idx + 2] - this.previousFrame.data[idx + 2]);
        const totalDiff = rDiff + gDiff + bDiff;

        if (totalDiff > maxDiff) {
          maxDiff = totalDiff;
          maxDiffX = x;
          maxDiffY = y;
        }
      }
    }

    this.previousFrame = currentFrame;

    if (maxDiff > 30) {
      return { x: maxDiffX, y: maxDiffY };
    }

    return null;
  }

  resetFrameComparison(): void {
    this.previousFrame = null;
  }

  // Auto-detect dartboard with ellipse detection for angled boards
  autoDetectDartboard(canvas: HTMLCanvasElement): { centerX: number; centerY: number; radiusX: number; radiusY: number; rotation: number } | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;
    
    console.log('Auto-detecting dartboard with ellipse detection for angled boards...');
    
    // Create color score map for dartboard colors (black, white, red, green)
    const colorScore: number[] = new Array(data.length / 4).fill(0);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const isDark = r < 80 && g < 80 && b < 80;
      const isLight = r > 200 && g > 200 && b > 200;
      const isRed = r > 150 && g < 100 && b < 100;
      const isGreen = r < 100 && g > 120 && b < 100;
      
      const pixelIndex = i / 4;
      if (isDark || isLight || isRed || isGreen) {
        colorScore[pixelIndex] = 1;
      }
    }
    
    // Try multiple ellipse parameters
    let bestScore = 0;
    let bestParams = { cx: Math.round(width / 2), cy: Math.round(height / 2), rx: Math.round(width * 0.25), ry: Math.round(height * 0.25), rotation: 0 };
    
    // Search for center (coarser grid for performance)
    const sampleStep = 30;
    for (let cy = Math.round(height * 0.2); cy < height * 0.8; cy += sampleStep) {
      for (let cx = Math.round(width * 0.2); cx < width * 0.8; cx += sampleStep) {
        
        // Try different aspect ratios (for angled views)
        for (let aspectRatio = 0.5; aspectRatio <= 1.0; aspectRatio += 0.15) {
          // Try different rotations
          for (let rotationAngle = 0; rotationAngle < Math.PI; rotationAngle += Math.PI / 8) {
            
            // Test with different radius sizes
            for (let testRadius = Math.round(Math.min(width, height) * 0.15); testRadius <= Math.min(width, height) * 0.4; testRadius += 10) {
              const rx = testRadius;
              const ry = Math.round(testRadius * aspectRatio);
              
              let score = 0;
              const testPoints = 40;
              
              // Sample points around the ellipse perimeter
              for (let i = 0; i < testPoints; i++) {
                const angle = (i / testPoints) * Math.PI * 2;
                
                // Ellipse equation with rotation:
                // x = cx + rx*cos(t)*cos(r) - ry*sin(t)*sin(r)
                // y = cy + rx*cos(t)*sin(r) + ry*sin(t)*cos(r)
                const cosT = Math.cos(angle);
                const sinT = Math.sin(angle);
                const cosR = Math.cos(rotationAngle);
                const sinR = Math.sin(rotationAngle);
                
                const x = Math.round(cx + rx * cosT * cosR - ry * sinT * sinR);
                const y = Math.round(cy + rx * cosT * sinR + ry * sinT * cosR);
                
                if (x >= 0 && x < width && y >= 0 && y < height) {
                  const pixelIndex = y * width + x;
                  score += colorScore[pixelIndex];
                }
              }
              
              // Also check inner ring
              const innerRx = rx * 0.6;
              const innerRy = ry * 0.6;
              for (let i = 0; i < testPoints; i++) {
                const angle = (i / testPoints) * Math.PI * 2;
                const cosT = Math.cos(angle);
                const sinT = Math.sin(angle);
                const cosR = Math.cos(rotationAngle);
                const sinR = Math.sin(rotationAngle);
                
                const x = Math.round(cx + innerRx * cosT * cosR - innerRy * sinT * sinR);
                const y = Math.round(cy + innerRx * cosT * sinR + innerRy * sinT * cosR);
                
                if (x >= 0 && x < width && y >= 0 && y < height) {
                  const pixelIndex = y * width + x;
                  score += colorScore[pixelIndex] * 0.5;
                }
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestParams = { cx, cy, rx, ry, rotation: rotationAngle };
              }
            }
          }
        }
      }
    }
    
    const rotationDegrees = (bestParams.rotation * 180 / Math.PI).toFixed(1);
    console.log(`Best ellipse found: center=(${bestParams.cx}, ${bestParams.cy}), rx=${bestParams.rx}, ry=${bestParams.ry}, rotation=${rotationDegrees}°, score=${bestScore}`);
    
    if (bestScore < 5) {
      console.warn('Weak detection, using frame center as fallback');
      return {
        centerX: Math.round(width / 2),
        centerY: Math.round(height / 2),
        radiusX: Math.round(width * 0.25),
        radiusY: Math.round(height * 0.25),
        rotation: 0
      };
    }
    
    return {
      centerX: bestParams.cx,
      centerY: bestParams.cy,
      radiusX: bestParams.rx,
      radiusY: bestParams.ry,
      rotation: bestParams.rotation
    };
  }

  drawDartboard(canvas: HTMLCanvasElement): void {
    if (!this.dartboardCenter) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x: centerX, y: centerY } = this.dartboardCenter;
    const radiusX = this.dartboardRadiusX;
    const radiusY = this.dartboardRadiusY;
    const rotation = this.dartboardRotation;

    ctx.save();
    
    // Move to center and rotate
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    
    // Draw ellipse rings
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    
    // Outer double ring
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Triple ring
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX * 0.65, radiusY * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Double ring  
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX * 0.58, radiusY * 0.58, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Single ring
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX * 0.42, radiusY * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Bulls eye rings
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX * 0.07, radiusY * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX * 0.04, radiusY * 0.04, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw segment lines
    const segments = 20;
    for (let i = 0; i < segments; i++) {
      const angle = (i * Math.PI * 2) / segments;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY);
      ctx.stroke();
    }
    
    // Center crosshair
    ctx.strokeStyle = '#ff0088';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();
    
    ctx.restore();
  }

  processFrame(canvas: HTMLCanvasElement, autoDetectEnabled: boolean): void {
    if (!this.dartboardCenter) {
      return;
    }

    // Draw dartboard overlay
    this.drawDartboard(canvas);

    // Auto-detect dart impacts if enabled
    if (autoDetectEnabled && this.detectionCallback) {
      const impact = this.detectDartImpact(canvas);
      if (impact) {
        const { score, multiplier } = this.calculateScore(impact.x, impact.y);
        if (score > 0) {
          console.log(`Dart detected at (${impact.x}, ${impact.y}): ${multiplier}x ${score}`);
          this.detectionCallback(score, multiplier);
        }
      }
    }
  }
}

export const dartDetectionService = new DartDetectionService();
