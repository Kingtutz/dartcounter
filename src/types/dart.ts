export interface DartThrow {
  id: string;
  score: number;
  multiplier: number; // 1 for single, 2 for double, 3 for triple
  timestamp: number;
  position?: { x: number; y: number };
}

export interface Player {
  id: string;
  name: string;
  score: number;
  throws: DartThrow[];
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  gameMode: '301' | '501' | 'cricket' | 'practice';
  isActive: boolean;
}

export interface Detection {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}
