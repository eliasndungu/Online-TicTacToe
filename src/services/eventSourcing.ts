/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameEvent, PlayerMark, ReplaySnapshot, ReconstructedGameState, GameWinner } from '../types/game';
import { checkBoardWinner } from './minimax';

/**
 * Pure Event Sourcing Replay Engine.
 * Replays sequential event streams (MOVE & ROLLBACK) to deterministically reconstruct
 * current board, turn, winning lines, and historical state snapshots for time-travel.
 */
export function reconstructState(events: GameEvent[]): ReconstructedGameState {
  // Sort events strictly by sequence number
  const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);

  // Turn 0: Empty initial state
  const initialSnapshot: ReplaySnapshot = {
    turnNumber: 0,
    board: Array(9).fill(null),
    currentTurn: 'X',
    winner: 'none',
    winningLine: null,
    lastMoveCell: null,
    lastPlayer: null,
    event: null,
  };

  let currentBoard: (PlayerMark | null)[] = Array(9).fill(null);
  let currentTurn: PlayerMark = 'X';
  let winner: GameWinner = 'none';
  let winningLine: number[] | null = null;
  let activeTurnCount = 0;

  // Track state snapshots at each turn number: key is turnNumber
  let snapshots: ReplaySnapshot[] = [initialSnapshot];

  for (const event of sortedEvents) {
    if (event.type === 'MOVE') {
      const cell = event.cellIndex;
      if (cell >= 0 && cell <= 8 && event.player !== 'system') {
        const nextBoard = [...currentBoard];
        nextBoard[cell] = event.player;
        currentBoard = nextBoard;

        const outcome = checkBoardWinner(currentBoard);
        if (outcome.winner === 'X' || outcome.winner === 'O') {
          winner = outcome.winner;
          winningLine = outcome.line;
        } else if (outcome.winner === 'draw') {
          winner = 'draw';
          winningLine = null;
        } else {
          winner = 'none';
          winningLine = null;
          currentTurn = event.player === 'X' ? 'O' : 'X';
        }

        activeTurnCount = event.turnNumber;

        const snapshot: ReplaySnapshot = {
          turnNumber: event.turnNumber,
          board: [...currentBoard],
          currentTurn,
          winner,
          winningLine: winningLine ? [...winningLine] : null,
          lastMoveCell: cell,
          lastPlayer: event.player,
          event,
        };

        // Append snapshot to timeline
        snapshots.push(snapshot);
      }
    } else if (event.type === 'ROLLBACK') {
      const targetTurn = event.targetTurnNumber ?? 0;
      // Revert state to the snapshot at targetTurn
      const targetSnap = snapshots.find((s) => s.turnNumber === targetTurn) || initialSnapshot;

      currentBoard = [...targetSnap.board];
      currentTurn = targetSnap.currentTurn;
      winner = targetSnap.winner;
      winningLine = targetSnap.winningLine ? [...targetSnap.winningLine] : null;
      activeTurnCount = targetTurn;

      // Slice snapshots back to targetTurn for active branch
      snapshots = snapshots.filter((s) => s.turnNumber <= targetTurn);
    }
  }

  return {
    board: currentBoard,
    currentTurn,
    winner,
    winningLine,
    turnCount: activeTurnCount,
    historySnapshots: snapshots,
    allEvents: sortedEvents,
  };
}

/**
 * Safe accessor to fetch the board snapshot for a given historical turn.
 */
export function getSnapshotForTurn(
  snapshots: ReplaySnapshot[],
  turnNumber: number
): ReplaySnapshot | null {
  return snapshots.find((s) => s.turnNumber === turnNumber) ?? null;
}
