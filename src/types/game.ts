/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlayerMark = 'X' | 'O';
export type GameMode = 'ai' | 'multiplayer';
export type AIDifficulty = 'unbeatable' | 'medium' | 'easy';
export type GameStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type GameWinner = 'X' | 'O' | 'draw' | 'none';
export type EventType = 'MOVE' | 'ROLLBACK';

export interface Game {
  id: string;
  shortCode: string;
  mode: GameMode;
  aiDifficulty?: AIDifficulty;
  playerXId: string;
  playerXName: string;
  playerXPhoto?: string;
  playerOId?: string | null;
  playerOName?: string;
  playerOPhoto?: string;
  status: GameStatus;
  winner: GameWinner;
  winningLine?: number[] | null;
  currentTurn: PlayerMark;
  totalEvents: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameEvent {
  id: string;
  gameId: string;
  type: EventType;
  sequence: number; // 1-indexed total event count in stream
  turnNumber: number; // The turn number resulting from this event
  player: PlayerMark | 'system';
  playerId: string;
  cellIndex: number; // 0-8 for MOVE, -1 for ROLLBACK
  targetTurnNumber?: number; // for ROLLBACK
  createdAt: string;
}

export interface ReplaySnapshot {
  turnNumber: number;
  board: (PlayerMark | null)[];
  currentTurn: PlayerMark;
  winner: GameWinner;
  winningLine: number[] | null;
  lastMoveCell: number | null;
  lastPlayer: PlayerMark | null;
  event: GameEvent | null;
}

export interface ReconstructedGameState {
  board: (PlayerMark | null)[];
  currentTurn: PlayerMark;
  winner: GameWinner;
  winningLine: number[] | null;
  turnCount: number;
  historySnapshots: ReplaySnapshot[];
  allEvents: GameEvent[];
}

export interface UserProfile {
  id: string;
  displayName: string;
  photoURL?: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  updatedAt: string;
}
