/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerMark, GameWinner, Game } from '../types/game';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Bot, Clock, RotateCcw } from 'lucide-react';

interface BoardProps {
  board: (PlayerMark | null)[];
  winningLine: number[] | null;
  winner: GameWinner;
  currentTurn: PlayerMark;
  isMyTurn: boolean;
  myMark: PlayerMark | null;
  isPreviewingHistory: boolean;
  previewTurnNumber: number;
  totalTurns: number;
  onCellClick: (cellIndex: number) => void;
  onExitPreview: () => void;
  onOpenRollbackModal: () => void;
  isAiThinking: boolean;
  game: Game;
}

export const Board: React.FC<BoardProps> = ({
  board,
  winningLine,
  winner,
  currentTurn,
  isMyTurn,
  myMark,
  isPreviewingHistory,
  previewTurnNumber,
  totalTurns,
  onCellClick,
  onExitPreview,
  onOpenRollbackModal,
  isAiThinking,
  game,
}) => {
  const isWinningCell = (idx: number) => winningLine?.includes(idx);

  // SVG strike line calculations
  const getStrikeLineCoords = () => {
    if (!winningLine) return null;
    const key = winningLine.join(',');
    switch (key) {
      case '0,1,2':
        return { x1: '8%', y1: '16.66%', x2: '92%', y2: '16.66%' };
      case '3,4,5':
        return { x1: '8%', y1: '50%', x2: '92%', y2: '50%' };
      case '6,7,8':
        return { x1: '8%', y1: '83.33%', x2: '92%', y2: '83.33%' };
      case '0,3,6':
        return { x1: '16.66%', y1: '8%', x2: '16.66%', y2: '92%' };
      case '1,4,7':
        return { x1: '50%', y1: '8%', x2: '50%', y2: '92%' };
      case '2,5,8':
        return { x1: '83.33%', y1: '8%', x2: '83.33%', y2: '92%' };
      case '0,4,8':
        return { x1: '10%', y1: '10%', x2: '90%', y2: '90%' };
      case '2,4,6':
        return { x1: '90%', y1: '10%', x2: '10%', y2: '90%' };
      default:
        return null;
    }
  };

  const strikeCoords = getStrikeLineCoords();

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Historical Time-Travel Banner */}
      {isPreviewingHistory && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-4 p-3 bg-gradient-to-r from-amber-950/80 to-amber-900/40 border border-amber-600/40 rounded-xl flex items-center justify-between shadow-lg shadow-amber-950/30"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-amber-200">
                Viewing Turn {previewTurnNumber} of {totalTurns}
              </p>
              <p className="text-[10px] text-amber-400/80">Historical preview only</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenRollbackModal}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm flex items-center gap-1 transition-transform active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              Restore Here
            </button>
            <button
              onClick={onExitPreview}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Live
            </button>
          </div>
        </motion.div>
      )}

      {/* Players header & turn status */}
      <div className="w-full grid grid-cols-2 gap-3 mb-4">
        {/* Player X Card */}
        <div
          className={`p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
            currentTurn === 'X' && winner === 'none'
              ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
              : 'bg-slate-900/60 border-slate-800/80'
          }`}
        >
          <div className="relative">
            {game.playerXPhoto ? (
              <img
                src={game.playerXPhoto}
                alt={game.playerXName}
                className="w-10 h-10 rounded-full border border-cyan-500/60 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center font-bold text-cyan-400">
                X
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[11px] flex items-center justify-center border-2 border-slate-950">
              X
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {game.playerXName || 'Player X'}
              {myMark === 'X' && <span className="text-[10px] text-cyan-400 ml-1">(You)</span>}
            </p>
            <p className="text-[11px] font-mono text-cyan-400/90 flex items-center gap-1">
              {currentTurn === 'X' && winner === 'none' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                  <span>Thinking...</span>
                </>
              ) : (
                <span className="text-slate-500">Waiting</span>
              )}
            </p>
          </div>
        </div>

        {/* Player O Card */}
        <div
          className={`p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
            currentTurn === 'O' && winner === 'none'
              ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/40'
              : 'bg-slate-900/60 border-slate-800/80'
          }`}
        >
          <div className="relative">
            {game.playerOPhoto ? (
              <img
                src={game.playerOPhoto}
                alt={game.playerOName || 'Player O'}
                className="w-10 h-10 rounded-full border border-rose-500/60 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-500/50 flex items-center justify-center font-bold text-rose-400">
                {game.mode === 'ai' ? <Bot className="w-5 h-5" /> : 'O'}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-slate-950 font-black text-[11px] flex items-center justify-center border-2 border-slate-950">
              O
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {game.playerOName || (game.mode === 'ai' ? 'AI Minimax' : 'Waiting...')}
              {myMark === 'O' && <span className="text-[10px] text-rose-400 ml-1">(You)</span>}
            </p>
            <p className="text-[11px] font-mono text-rose-400/90 flex items-center gap-1">
              {currentTurn === 'O' && winner === 'none' ? (
                isAiThinking ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
                    <span>Thinking...</span>
                  </>
                )
              ) : (
                <span className="text-slate-500">Waiting</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main 3x3 Board Grid Container */}
      <div className="relative w-full aspect-square bg-slate-900/80 rounded-3xl border border-slate-800 p-3 shadow-2xl backdrop-blur-sm overflow-hidden">
        {/* Grid cells */}
        <div className="grid grid-cols-3 grid-rows-3 gap-2.5 w-full h-full">
          {board.map((cellValue, idx) => {
            const isWinning = isWinningCell(idx);
            const canClick =
              !isPreviewingHistory &&
              winner === 'none' &&
              cellValue === null &&
              isMyTurn &&
              !isAiThinking &&
              game.status === 'in_progress';

            return (
              <button
                key={idx}
                onClick={() => canClick && onCellClick(idx)}
                disabled={!canClick}
                aria-label={`Cell ${idx + 1}`}
                className={`relative flex items-center justify-center rounded-2xl text-4xl sm:text-5xl font-black font-mono transition-all duration-200 select-none group
                  ${
                    isWinning
                      ? cellValue === 'X'
                        ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-lg shadow-cyan-500/30'
                        : 'bg-rose-500/20 border-2 border-rose-400 shadow-lg shadow-rose-500/30'
                      : 'bg-slate-950/60 border border-slate-800/80'
                  }
                  ${
                    canClick
                      ? 'hover:bg-slate-800/60 hover:border-slate-700 cursor-pointer active:scale-95'
                      : 'cursor-default'
                  }
                `}
              >
                {/* Cell Mark */}
                <AnimatePresence mode="wait">
                  {cellValue === 'X' && (
                    <motion.span
                      key="X"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                      className="text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                    >
                      X
                    </motion.span>
                  )}
                  {cellValue === 'O' && (
                    <motion.span
                      key="O"
                      initial={{ scale: 0, rotate: 30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                      className="text-transparent bg-clip-text bg-gradient-to-tr from-rose-400 via-pink-400 to-amber-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                    >
                      O
                    </motion.span>
                  )}
                  {/* Hover Ghost Mark */}
                  {cellValue === null && canClick && myMark && (
                    <span className="opacity-0 group-hover:opacity-30 transition-opacity text-slate-400 text-3xl font-bold">
                      {myMark}
                    </span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        {/* Dynamic Strike Line SVG */}
        {strikeCoords && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <motion.line
              x1={strikeCoords.x1}
              y1={strikeCoords.y1}
              x2={strikeCoords.x2}
              y2={strikeCoords.y2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              stroke={winner === 'X' ? '#22d3ee' : '#fb7185'}
              strokeWidth="6"
              strokeLinecap="round"
              className="drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]"
            />
          </svg>
        )}
      </div>

      {/* Outcome Banner */}
      {winner !== 'none' && !isPreviewingHistory && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`w-full mt-4 p-4 rounded-2xl border text-center font-medium shadow-xl ${
            winner === 'draw'
              ? 'bg-slate-900 border-slate-700 text-slate-300'
              : winner === myMark
              ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-gradient-to-r from-rose-950/80 to-slate-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">
              {winner === 'draw'
                ? "It's a Stalemate Draw!"
                : winner === myMark
                ? 'Victory! You Won!'
                : `${winner === 'X' ? game.playerXName : game.playerOName || 'Opponent'} Wins!`}
            </h3>
          </div>
          <p className="text-xs opacity-80">
            Replay any turn using the timeline below, or restore the game to an earlier turn to try
            a different path!
          </p>
        </motion.div>
      )}
    </div>
  );
};
