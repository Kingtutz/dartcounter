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
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [clickedCenter, setClickedCenter] = useState<{ x: number; y: number } | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const registerThrow = useCallback((score: number, multiplier: number) => {
    setGameState(prev => {
      if (!prev.isActive) return prev;

      const currentPlayer = prev.players[prev.currentPlayerIndex];
      const newThrow: DartThrow = {
        id: `${Date.now()}`,
        score,
        multiplier,
        timestamp: Date.now()
      };

      const updatedPlayers = [...prev.players];
      updatedPlayers[prev.currentPlayerIndex] = {
        ...currentPlayer,
        throws: [...currentPlayer.throws, newThrow],
        score: currentPlayer.score + (score * multiplier)
      };

      // Move to next player after 3 throws
      const throwsCount = updatedPlayers[prev.currentPlayerIndex].throws.length;
      const nextPlayerIndex = throwsCount % 3 === 0 
        ? (prev.currentPlayerIndex + 1) % prev.players.length
        : prev.currentPlayerIndex;

      return {
        ...prev,
        players: updatedPlayers,
        currentPlayerIndex: nextPlayerIndex
      };
    });
  }, []);

  useEffect(() => {
    const initModel = async () => {
      try {
        await dartDetectionService.initialize();
        setModelLoaded(true);
        
        // Set up auto-detection callback
        dartDetectionService.setDetectionCallback((score, multiplier) => {
          if (autoDetectEnabled && gameState.isActive) {
            registerThrow(score, multiplier);
          }
        });
        
        console.log('Detection model initialized');
      } catch (error) {
        console.error('Failed to initialize model:', error);
      }
    };

    initModel();
  }, [autoDetectEnabled, gameState.isActive, registerThrow]);

  const handleCalibrate = useCallback((centerX: number, centerY: number, radius: number) => {
    if (canvasRef.current) {
      dartDetectionService.calibrateDartboard(canvasRef.current, centerX, centerY, radius);
      setIsCalibrated(true);
      console.log(`Dartboard calibrated at (${centerX}, ${centerY}) with radius ${radius}`);
    }
  }, []);

  const handleAutoCalibrate = useCallback(() => {
    if (canvasRef.current) {
      const result = dartDetectionService.autoDetectDartboard(canvasRef.current);
      if (result) {
        dartDetectionService.calibrateDartboard(
          canvasRef.current, 
          result.centerX, 
          result.centerY, 
          result.radiusX,
          result.radiusY,
          result.rotation
        );
        setIsCalibrated(true);
        const angleDegrees = (result.rotation * 180 / Math.PI).toFixed(1);
        console.log(`Auto-calibrated ellipse dartboard: center=(${result.centerX}, ${result.centerY}), radiusX=${result.radiusX}, radiusY=${result.radiusY}, rotation=${angleDegrees}°`);
        alert(`Auto-calibration complete!\nCenter: (${Math.round(result.centerX)}, ${Math.round(result.centerY)})\nRadius X: ${Math.round(result.radiusX)}\nRadius Y: ${Math.round(result.radiusY)}\nAngle: ${angleDegrees}°`);
      } else {
        alert('Could not detect dartboard. Please use manual calibration.');
      }
    }
  }, []);

  const handleFrame = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;

    // Process frame with auto-detection if enabled
    if (isCalibrated) {
      dartDetectionService.processFrame(canvas, autoDetectEnabled && gameState.isActive);
    }
  }, [isCalibrated, autoDetectEnabled, gameState.isActive]);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setGameState(prev => {
      const updatedPlayers = [...prev.players];
      updatedPlayers[index] = { ...updatedPlayers[index], name };
      return { ...prev, players: updatedPlayers };
    });
  }, []);

  const updatePlayerCount = useCallback((count: number) => {
    setPlayerCount(count);
    setGameState(prev => {
      const newPlayers = Array.from({ length: count }, (_, i) => {
        const existingPlayer = prev.players[i];
        return existingPlayer || {
          id: `${i + 1}`,
          name: `Player ${i + 1}`,
          score: 0,
          throws: []
        };
      });
      return { ...prev, players: newPlayers };
    });
  }, []);

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isActive: true,
      players: prev.players.map(p => ({ ...p, score: 0, throws: [] })),
      currentPlayerIndex: 0
    }));
    setIsDetecting(true);
    setShowPlayerSetup(false);
    dartDetectionService.resetFrameComparison();
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

  const handleCameraClick = (x: number, y: number) => {
    setClickedCenter({ x, y });
    console.log(`Clicked dartboard center at: (${x}, ${y})`);
  };

  const openPlayerSetup = () => {
    setShowPlayerSetup(true);
  };

  const closePlayerSetup = () => {
    setShowPlayerSetup(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎯 Auto Dart Counter</h1>
        <p className="subtitle">
          {modelLoaded ? '✓ AI Model Loaded' : '⏳ Loading AI Model...'}
        </p>
        <div className="header-controls">
          <label className="auto-detect-toggle">
            <input
              type="checkbox"
              checked={autoDetectEnabled}
              onChange={(e) => setAutoDetectEnabled(e.target.checked)}
            />
            <span className="toggle-label">
              🤖 Auto-Detect Darts {autoDetectEnabled ? '(ON)' : '(OFF)'}
            </span>
          </label>
        </div>
        {gameState.isActive && (
          <div className="current-turn">
            <strong>Current Player:</strong> {gameState.players[gameState.currentPlayerIndex].name}
            <span className="throw-count">
              (Throw {(gameState.players[gameState.currentPlayerIndex].throws.length % 3) + 1} of 3)
            </span>
          </div>
        )}
      </header>

      <div className="main-content">
        <div className="left-panel">
          <CameraFeed 
            onFrame={handleFrame} 
            isDetecting={isDetecting}
            onCameraClick={handleCameraClick}
          />
          
          <DartboardCalibration 
            onCalibrate={handleCalibrate}
            onAutoCalibrate={handleAutoCalibrate}
            isCalibrated={isCalibrated}
            clickedCenter={clickedCenter}
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
            onPlayerSetup={openPlayerSetup}
          />
        </div>
      </div>

      {showPlayerSetup && (
        <div className="modal-overlay" onClick={closePlayerSetup}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Player Setup</h2>
            
            <div className="player-count-selector">
              <label>Number of Players:</label>
              <div className="count-buttons">
                {[1, 2, 3, 4, 5, 6].map(count => (
                  <button
                    key={count}
                    onClick={() => updatePlayerCount(count)}
                    className={playerCount === count ? 'active' : ''}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="player-names">
              <h3>Player Names</h3>
              {gameState.players.map((player, index) => (
                <div key={player.id} className="player-name-input">
                  <label>Player {index + 1}:</label>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                  />
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button onClick={closePlayerSetup} className="btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
