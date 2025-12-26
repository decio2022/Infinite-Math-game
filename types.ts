
export interface MathProblem {
  question: string;
  answer: number;
  explanation?: string;
  level: number;
}

export interface GameSettings {
  allowLinear: boolean;
  allowQuadratic: boolean;
}

export interface GameState {
  score: number;
  level: number;
  bestLevel: number;
  currentProblem: MathProblem | null;
  status: 'IDLE' | 'PLAYING' | 'CORRECT' | 'WRONG';
  settings: GameSettings;
}
