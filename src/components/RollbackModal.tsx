/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';

interface RollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetTurnNumber: number;
  liveTurnNumber: number;
  isAiMatch: boolean;
}

export const RollbackModal: React.FC<RollbackModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetTurnNumber,
  liveTurnNumber,
  isAiMatch,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Time-Travel Rollback</h3>
            <p className="text-xs text-amber-400 font-medium">Event-Sourced State Restoration</p>
          </div>
        </div>

        <div className="my-4 p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
          <div className="flex justify-between items-center py-1 border-b border-slate-800">
            <span className="text-slate-400">Live Turn:</span>
            <span className="font-mono font-bold text-slate-200">Turn {liveTurnNumber}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-800">
            <span className="text-slate-400">Target Restore Turn:</span>
            <span className="font-mono font-bold text-amber-400">Turn {targetTurnNumber}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Turns Rewound:</span>
            <span className="font-mono font-bold text-rose-400">
              {liveTurnNumber - targetTurnNumber} turns
            </span>
          </div>
        </div>

        <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl mb-5 flex items-start gap-2.5 text-xs text-amber-200/90">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p>
            This action writes an immutable <strong>ROLLBACK</strong> event to the Firestore event
            stream. The match board will be restored to Turn {targetTurnNumber} so you can resume
            play from that exact moment.
            {isAiMatch && ' The AI opponent will adapt accordingly.'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Confirm & Restore to Turn {targetTurnNumber}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
