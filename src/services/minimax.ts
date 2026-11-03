/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerMark, AIDifficulty } from '../types/game';

export const WINNING_COMBINATIONS: [number, number, number][] = [
  [0, 1, 2], // row 1
  [3, 4, 5], // row 2
  [6, 7, 8], // row 3
  [0, 3, 6], // col 1
  [1, 4, 7], // col 2
  [2, 5, 8], // col 3
  [0, 4, 8], // diagonal top-left to bottom-right
  [2, 4, 6], // diagonal top-right to bottom-left
];

export function checkBoardWinner(
  board: (PlayerMark | null)[]
): { winner: PlayerMark | 'draw' | null; line: number[] | null } {
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }

  const isFull = board.every((cell) => cell !== null);
  if (isFull) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

export function getAvailableCells(board: (PlayerMark | null)[]): number[] {
  const cells: number[] = [];
  board.forEach((val, idx) => {
    if (val === null) cells.push(idx);
  });
  return cells;
}

/**
 * Minimax recursive algorithm with depth-weighting
 */
function minimax(
  board: (PlayerMark | null)[],
  depth: number,
  isMaximizing: boolean,
  aiMark: PlayerMark,
  humanMark: PlayerMark,
  alpha: number = -Infinity,
  beta: number = Infinity
): number {
  const result = checkBoardWinner(board);
  if (result.winner === aiMark) return 10 - depth;
  if (result.winner === humanMark) return depth - 10;
  if (result.winner === 'draw') return 0;

  const available = getAvailableCells(board);

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const idx of available) {
      board[idx] = aiMark;
      const score = minimax(board, depth + 1, false, aiMark, humanMark, alpha, beta);
      board[idx] = null;
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const idx of available) {
      board[idx] = humanMark;
      const score = minimax(board, depth + 1, true, aiMark, humanMark, alpha, beta);
      board[idx] = null;
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

/**
 * Computes best move index (0-8) using Minimax according to selected difficulty.
 */
export function getBestAIMove(
  board: (PlayerMark | null)[],
  aiMark: PlayerMark = 'O',
  difficulty: AIDifficulty = 'unbeatable'
): number | null {
  const available = getAvailableCells(board);
  if (available.length === 0) return null;

  const humanMark: PlayerMark = aiMark === 'X' ? 'O' : 'X';

  // 1. Easy mode: 60% random choice, 40% optimal/blocking
  if (difficulty === 'easy') {
    if (Math.random() < 0.6) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  // 2. Medium mode: 30% random choice unless immediate win/block
  if (difficulty === 'medium') {
    // Check if immediate win is available
    for (const idx of available) {
      board[idx] = aiMark;
      if (checkBoardWinner(board).winner === aiMark) {
        board[idx] = null;
        return idx;
      }
      board[idx] = null;
    }
    // Check if opponent is about to win, block them!
    for (const idx of available) {
      board[idx] = humanMark;
      if (checkBoardWinner(board).winner === humanMark) {
        board[idx] = null;
        return idx;
      }
      board[idx] = null;
    }

    if (Math.random() < 0.3) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  // 3. Unbeatable / Fallback Minimax calculation:
  // If first move as center or corner for speed and variety
  if (available.length === 9) {
    const openings = [0, 2, 4, 6, 8];
    return openings[Math.floor(Math.random() * openings.length)];
  }

  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  for (const idx of available) {
    board[idx] = aiMark;
    const score = minimax(board, 0, false, aiMark, humanMark);
    board[idx] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [idx];
    } else if (score === bestScore) {
      bestMoves.push(idx);
    }
  }

  // Pick one among best moves for variation
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? available[0];
}
