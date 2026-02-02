import { useState } from 'react';

interface GameControlsProps {
  gameMode: string;
  isActive: boolean;
  onStartGame: () => void;
  onEndGame: () => void;
  onRegisterThrow: (score: number, multiplier: number) => void;
  onGameModeChange: (mode: '301' | '501' | 'cricket' | 'practice') => void;
  onPlayerSetup: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameMode,
  isActive,
  onStartGame,
  onEndGame,
  onRegisterThrow,
  onGameModeChange,
  onPlayerSetup,
}) => {
  const [manualScore, setManualScore] = useState(20);
  const [manualMultiplier, setManualMultiplier] = useState(1);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const handleManualThrow = () => {
    onRegisterThrow(manualScore, manualMultiplier);
  };

  const handleScoreClick = (score: number) => {
    setLastScore(score);
    onRegisterThrow(score, 1);
  };

  const handleMultiplier = (multiplier: number) => {
    if (lastScore !== null) {
      onRegisterThrow(lastScore, multiplier);
    }
  };

  return (
    <div className="game-controls">
      <div className="mode-selection">
        <h3>Game Mode</h3>
        <div className="mode-buttons">
          <button 
            onClick={() => onGameModeChange('301')}
            className={gameMode === '301' ? 'active' : ''}
            disabled={isActive}
          >
            301
          </button>
          <button 
            onClick={() => onGameModeChange('501')}
            className={gameMode === '501' ? 'active' : ''}
            disabled={isActive}
          >
            501
          </button>
          <button 
            onClick={() => onGameModeChange('cricket')}
            className={gameMode === 'cricket' ? 'active' : ''}
            disabled={isActive}
          >
            Cricket
          </button>
          <button 
            onClick={() => onGameModeChange('practice')}
            className={gameMode === 'practice' ? 'active' : ''}
            disabled={isActive}
          >
            Practice
          </button>
        </div>
      </div>

      <div className="game-actions">
        {!isActive ? (
          <>
            <button onClick={onPlayerSetup} className="btn-secondary btn-large">
              👥 Setup Players
            </button>
            <button onClick={onStartGame} className="btn-primary btn-large">
              Start Game
            </button>
          </>
        ) : (
          <button onClick={onEndGame} className="btn-danger btn-large">
            End Game
          </button>
        )}
      </div>

      <div className="manual-entry">
        <h3>🎯 Register Dart Throw</h3>
        <p className="entry-hint">Click the score where your dart landed</p>
        
        <div className="number-grid">
          {[20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5].map(num => (
            <button
              key={num}
              onClick={() => handleScoreClick(num)}
              disabled={!isActive}
              className="score-btn"
            >
              {num}
            </button>
          ))}
        </div>

        <div className="multiplier-section">
          <h4>Quick Doubles & Triples {lastScore && `(Last: ${lastScore})`}</h4>
          <div className="multiplier-grid">
            <button 
              onClick={() => handleMultiplier(2)}
              disabled={!isActive || lastScore === null}
              className="multiplier-btn double"
            >
              Double {lastScore ? `D${lastScore} = ${lastScore * 2}` : '(Select score first)'}
            </button>
            <button 
              onClick={() => handleMultiplier(3)}
              disabled={!isActive || lastScore === null}
              className="multiplier-btn triple"
            >
              Triple {lastScore ? `T${lastScore} = ${lastScore * 3}` : '(Select score first)'}
            </button>
          </div>
        </div>

        <div className="quick-scores">
          <h4>Special Scores</h4>
          <div className="special-grid">
            <button onClick={() => onRegisterThrow(25, 1)} disabled={!isActive} className="special-btn bull">
              Bull 25
            </button>
            <button onClick={() => onRegisterThrow(50, 1)} disabled={!isActive} className="special-btn bullseye">
              Bullseye 50
            </button>
            <button onClick={() => onRegisterThrow(0, 1)} disabled={!isActive} className="special-btn miss">
              Miss (0)
            </button>
          </div>
        </div>

        <div className="advanced-entry">
          <details>
            <summary>Advanced Entry</summary>
            <div className="manual-controls">
              <div className="control-group">
                <label>Score:</label>
                <input
                  type="number"
                  value={manualScore}
                  onChange={(e) => setManualScore(Number(e.target.value))}
                  min="0"
                  max="20"
                />
              </div>
              
              <div className="control-group">
                <label>Multiplier:</label>
                <select
                  value={manualMultiplier}
                  onChange={(e) => setManualMultiplier(Number(e.target.value))}
                >
                  <option value="1">Single (×1)</option>
                  <option value="2">Double (×2)</option>
                  <option value="3">Triple (×3)</option>
                </select>
              </div>

              <button 
                onClick={handleManualThrow} 
                className="btn-secondary"
                disabled={!isActive}
              >
                Register Custom
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};
