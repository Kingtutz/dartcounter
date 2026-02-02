import { useState } from 'react';

interface GameControlsProps {
  gameMode: string;
  isActive: boolean;
  onStartGame: () => void;
  onEndGame: () => void;
  onRegisterThrow: (score: number, multiplier: number) => void;
  onGameModeChange: (mode: '301' | '501' | 'cricket' | 'practice') => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameMode,
  isActive,
  onStartGame,
  onEndGame,
  onRegisterThrow,
  onGameModeChange,
}) => {
  const [manualScore, setManualScore] = useState(20);
  const [manualMultiplier, setManualMultiplier] = useState(1);

  const handleManualThrow = () => {
    onRegisterThrow(manualScore, manualMultiplier);
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
          <button onClick={onStartGame} className="btn-primary btn-large">
            Start Game
          </button>
        ) : (
          <button onClick={onEndGame} className="btn-danger btn-large">
            End Game
          </button>
        )}
      </div>

      <div className="manual-entry">
        <h3>Manual Score Entry</h3>
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
            Register Throw
          </button>
        </div>

        <div className="quick-scores">
          <button onClick={() => onRegisterThrow(25, 1)} disabled={!isActive}>Bull 25</button>
          <button onClick={() => onRegisterThrow(50, 1)} disabled={!isActive}>Bull 50</button>
          <button onClick={() => onRegisterThrow(0, 1)} disabled={!isActive}>Miss</button>
        </div>
      </div>
    </div>
  );
};
