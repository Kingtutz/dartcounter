import type { Player, DartThrow } from '../types/dart';

interface ScoreBoardProps {
  players: Player[];
  currentPlayerIndex: number;
  gameMode: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ 
  players, 
  currentPlayerIndex,
  gameMode 
}) => {
  const getPlayerScore = (player: Player) => {
    if (gameMode === '301' || gameMode === '501') {
      const startingScore = parseInt(gameMode);
      const totalThrown = player.throws.reduce((sum, t) => sum + (t.score * t.multiplier), 0);
      return startingScore - totalThrown;
    }
    return player.score;
  };

  const getLastThreeThrows = (player: Player): DartThrow[] => {
    return player.throws.slice(-3);
  };

  return (
    <div className="scoreboard">
      <h2>Scoreboard - {gameMode.toUpperCase()}</h2>
      <div className="players-container">
        {players.map((player, index) => (
          <div 
            key={player.id} 
            className={`player-card ${index === currentPlayerIndex ? 'active' : ''}`}
          >
            <div className="player-header">
              <h3>{player.name}</h3>
              {index === currentPlayerIndex && <span className="current-indicator">▶</span>}
            </div>
            
            <div className="player-score">
              <div className="score-value">{getPlayerScore(player)}</div>
              {(gameMode === '301' || gameMode === '501') && (
                <div className="score-label">Remaining</div>
              )}
            </div>

            <div className="recent-throws">
              <div className="throws-label">Last 3 Throws:</div>
              <div className="throws-grid">
                {getLastThreeThrows(player).map((throw_, idx) => {
                  const multiplierText = throw_.multiplier === 2 ? 'D' : throw_.multiplier === 3 ? 'T' : '';
                  return (
                    <div key={idx} className="throw-item">
                      {multiplierText}{throw_.score}
                    </div>
                  );
                })}
                {Array.from({ length: 3 - getLastThreeThrows(player).length }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="throw-item empty">-</div>
                ))}
              </div>
            </div>

            <div className="total-throws">
              Total Darts: {player.throws.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
