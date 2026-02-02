import { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  onFrame?: (canvas: HTMLCanvasElement) => void;
  isDetecting: boolean;
  onCameraClick?: (x: number, y: number) => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onFrame, isDetecting: _isDetecting, onCameraClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCameraClick || !containerRef.current || !videoRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * videoRef.current.videoWidth;
    const y = ((e.clientY - rect.top) / rect.height) * videoRef.current.videoHeight;
    
    onCameraClick(Math.round(x / zoom), Math.round(y / zoom));
  };

  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment'
          }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError(`Camera error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const processFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        if (onFrame) {
          onFrame(canvas);
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
  }, [stream, onFrame]);

  return (
    <div className="camera-container" ref={containerRef} onClick={handleClick}>
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="camera-wrapper" style={{ transform: `scale(${zoom})` }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-feed"
            />
            <canvas
              ref={canvasRef}
              className="detection-canvas"
            />
          </div>
          <div className="camera-controls">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setZoom(Math.max(1, zoom - 0.1));
              }}
              className="zoom-btn"
              disabled={zoom <= 1}
            >
              ➖ Zoom Out
            </button>
            <div className="zoom-slider-container">
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="zoom-slider"
              />
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setZoom(Math.min(3, zoom + 0.1));
              }}
              className="zoom-btn"
              disabled={zoom >= 3}
            >
              ➕ Zoom In
            </button>
          </div>
        </>
      )}
    </div>
  );
};
