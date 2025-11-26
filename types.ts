export enum PlayerLevel {
  BEGINNER = '初學',
  INTERMEDIATE = '中階',
  ADVANCED = '高階',
  PRO = '校隊/職業'
}

export type Gender = 'male' | 'female';

export interface Player {
  id: string;
  name: string;
  level: PlayerLevel | string; // Allow string for the 1-18 level system
  gamesPlayed: number;
  lastMatchTime?: number; // Timestamp of when their last match ended
  isPaused: boolean; // If true, player is taking a break
  isPlaceholder?: boolean; // New: Identifies empty slots in manual matchmaking
  gender: Gender;
}

export interface Team {
  player1: Player;
  player2: Player;
}

export interface Match {
  id: string;
  courtId: number;
  teamA: Team;
  teamB: Team;
  startTime: number;
  endTime?: number;
}

export interface Court {
  id: number;
  name: string;
  currentMatch: Match | null;
}

export interface AnalysisResult {
  matchId: string;
  content: string;
}