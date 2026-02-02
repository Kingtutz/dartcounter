import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { CameraFeed } from './components/CameraFeed'
import { ScoreBoard } from './components/ScoreBoard'
import { DartboardCalibration } from './components/DartboardCalibration'
import { GameControls } from './components/GameControls'
import { dartDetectionService } from './services/dartDetection'
import type { DartThrow, GameState } from './types/dart'

function App() {
  const [gameState, setGameState] = useState<GameState>({
    players: [
      { id: '1', name: 'Player 1', score: 0, throws: [] },
      { id: '2', name: 'Player 2', score: 0, throws: [] }
    ],
    currentPlayerIndex: 0,
    gameMode: '501',
    isActive: false
  });

  const [isDetecting, setIsDetecting] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const initModel = async () => {
      try {
        await dartDetectionService.initialize();
        setModelLoaded(true);
        console.log('Detection model initialized');
      } catch (error) {
        console.error('Failed to initialize model:', error);
      }
    };

    initModel();
  }, []);

  const handleCalibrate = useCallback((centerX: number, centerY: number, radius: number) => {
    if (canvasRef.current) {
      dartDetectionService.calibrateDartboard(canvasRef.current, centerX, centerY, radius);
      setIsCalibrated(true);
      console.log(`Dartboard calibrated at (${centerX}, ${centerY}) with radius ${radius}`);
    }
  }, []);

  const handleFrame = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect darts in the frame
    dartDetectionService.detectDarts(canvas).then(detections => {
      if (detections.length > 0) {
        dartDetectionService.drawDetections(ctx, detections);
      }
    });

    // Draw dartboard overlay if calibrated
    if (isCalibrated) {
      // You would get these values from calibration
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) / 4;
      dartDetectionService.drawDartboard(ctx, centerX, centerY, radius);
    }
  }, [isCalibrated]);

  const registerThrow = useCallback((score: number, multiplier: number) => {
    if (!gameState.isActive) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const newThrow: DartThrow = {
      id: `${Date.now()}`,
      score,
      multiplier,
      timestamp: Date.now()
    };

    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex] = {
      ...currentPlayer,
      throws: [...currentPlayer.throws, newThrow],
      score: currentPlayer.score + (score * multiplier)
    };

    // Move to next player after 3 throws
    const throwsCount = updatedPlayers[gameState.currentPlayerIndex].throws.length;
    const nextPlayerIndex = throwsCount % 3 === 0 
      ? (gameState.currentPlayerIndex + 1) % gameState.players.length
      : gameState.currentPlayerIndex;

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex
    }));
  }, [gameState]);

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isActive: true,
      players: prev.players.map(p => ({ ...p, score: 0, throws: [] })),
      currentPlayerIndex: 0
    }));
    setIsDetecting(true);
  }, []);

  const endGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isActive: false
    }));
    setIsDetecting(false);
  }, []);

  const changeGameMode = useCallback((mode: '301' | '501' | 'cricket' | 'practice') => {
    setGameState(prev => ({
      ...prev,
      gameMode: mode
    }));
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎯 Auto Dart Counter</h1>
        <p className="subtitle">
          {modelLoaded ? '✓ AI Model Loaded' : '⏳ Loading AI Model...'}
        </p>
      </header>

      <div className="main-content">
        <div className="left-panel">
          <CameraFeed 
            onFrame={handleFrame} 
            isDetecting={isDetecting}
          />
          
          <DartboardCalibration 
            onCalibrate={handleCalibrate}
            isCalibrated={isCalibrated}
          />
        </div>

        <div className="right-panel">
          <ScoreBoard 
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            gameMode={gameState.gameMode}
          />

          <GameControls
            gameMode={gameState.gameMode}
            isActive={gameState.isActive}
            onStartGame={startGame}
            onEndGame={endGame}
            onRegisterThrow={registerThrow}
            onGameModeChange={changeGameMode}
          />
        </div>
      </div>
    </div>
  )
}

export default App
