/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ReplaySnapshot, GameEvent } from '../types/game';
import {
  RotateCcw,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  History,
  FileCode2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TimelineScrubberProps {
  snapshots: ReplaySnapshot[];
  allEvents: GameEvent[];
  selectedTurn: number;
  liveTurn: number;
  onSelectTurn: (turnNumber: number) => void;
  onOpenRollbackModal: (turnNumber: number) => void;
  canRollback: boolean;
}

const CELL_NAMES: Record<number, string> = {
  0: 'Top-Left',
  1: 'Top-Center',
  2: 'Top-Right',
  3: 'Mid-Left',
  4: 'Center',
  5: 'Mid-Right',
  6: 'Bottom-Left',
  7: 'Bottom-Center',
  8: 'Bottom-Right',
};

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  snapshots,
  allEvents,
  selectedTurn,
  liveTurn,
  onSelectTurn,
  onOpenRollbackModal,
  canRollback,
}) => {
  const [showEventLog, setShowEventLog] = useState(false);

  const isAtLive = selectedTurn === liveTurn;

  return (
    <div className="w-full max-w-xl mx-auto mt-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Event Sourcing Timeline
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Turn {selectedTurn} of {liveTurn}
          </span>
          {isAtLive ? (
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live State
            </span>
          ) : (
            <button
              onClick={() => onSelectTurn(liveTurn)}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
            >
              Jump to Live
            </button>
          )}
        </div>
      </div>

      {/* Scrub Slider */}
      <div className="px-1 py-2">
        <input
          type="range"
          min={0}
          max={liveTurn}
          value={selectedTurn}
          onChange={(e) => onSelectTurn(Number(e.target.value))}
          disabled={liveTurn === 0}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
        />
      </div>

      {/* Playback Controls & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80">
        {/* Navigation Step Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSelectTurn(0)}
            disabled={selectedTurn === 0}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Start of Match (Turn 0)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelectTurn(Math.max(0, selectedTurn - 1))}
            disabled={selectedTurn === 0}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous Turn"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelectTurn(Math.min(liveTurn, selectedTurn + 1))}
            disabled={selectedTurn === liveTurn}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next Turn"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelectTurn(liveTurn)}
            disabled={selectedTurn === liveTurn}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Latest / Live Turn"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Restore / Rollback Trigger Button */}
        <div>
          {!isAtLive && canRollback ? (
            <button
              onClick={() => onOpenRollbackModal(selectedTurn)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Game to Turn {selectedTurn}</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 italic">
              {liveTurn === 0
                ? 'No turns played yet'
                : 'Scrub backwards to preview or restore prior states'}
            </span>
          )}
        </div>
      </div>

      {/* Snapshots chips horizontal list */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
        {snapshots.map((snap) => {
          const isSelected = snap.turnNumber === selectedTurn;
          let label = snap.turnNumber === 0 ? 'Start' : `T${snap.turnNumber}`;
          let detail = 'Initial';
          if (snap.lastPlayer && snap.lastMoveCell !== null) {
            detail = `${snap.lastPlayer}: ${CELL_NAMES[snap.lastMoveCell] || snap.lastMoveCell}`;
          }

          return (
            <button
              key={snap.turnNumber}
              onClick={() => onSelectTurn(snap.turnNumber)}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl border text-left text-xs transition-all ${
                isSelected
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-sm ring-1 ring-cyan-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="font-mono font-bold text-[11px]">{label}</div>
              <div className="text-[10px] opacity-75 truncate max-w-[85px]">{detail}</div>
            </button>
          );
        })}
      </div>

      {/* Expandable Raw Event Stream Inspector */}
      <div className="mt-3 pt-2 border-t border-slate-800/80">
        <button
          onClick={() => setShowEventLog(!showEventLog)}
          className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 text-xs py-1 transition-colors"
        >
          <div className="flex items-center gap-1.5 font-medium">
            <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Inspect Immutable Event Stream ({allEvents.length} events logged)</span>
          </div>
          {showEventLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showEventLog && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-2 font-mono text-[11px] space-y-1.5">
            {allEvents.length === 0 ? (
              <p className="text-slate-500 italic p-1">No events recorded in subcollection yet.</p>
            ) : (
              allEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`p-2 rounded-lg border ${
                    evt.type === 'ROLLBACK'
                      ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      #{evt.sequence} [{evt.type}]
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {evt.type === 'MOVE' ? (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Player <span className="font-semibold text-cyan-400">{evt.player}</span> placed
                      mark at cell {evt.cellIndex} ({CELL_NAMES[evt.cellIndex] || evt.cellIndex}) &rarr;{' '}
                      Turn {evt.turnNumber}
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-300 mt-0.5">
                      Rewound match state back to Turn {evt.targetTurnNumber}
                    </div>
                  )}
                  <div className="text-[9px] text-slate-600 truncate mt-0.5">
                    ID: {evt.id} | Actor: {evt.playerId}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
