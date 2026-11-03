/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AIDifficulty, UserProfile } from '../types/game';
import { Bot, Users, Play, ArrowRight, ShieldCheck, Cpu, History, Zap, Trophy } from 'lucide-react';

interface MatchLobbyProps {
  onStartAiGame: (difficulty: AIDifficulty) => void;
  onCreateMultiplayerGame: () => void;
  onJoinGame: (codeOrId: string) => void;
  profile: UserProfile | null;
  isSignedIn: boolean;
  onSignIn: () => void;
  isLoading: boolean;
}

export const MatchLobby: React.FC<MatchLobbyProps> = ({
  onStartAiGame,
  onCreateMultiplayerGame,
  onJoinGame,
  profile,
  isSignedIn,
  onSignIn,
  isLoading,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('unbeatable');
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'ai' | 'multiplayer'>('ai');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      onJoinGame(joinCode.trim());
    }
  };

  const winRate =
    profile && profile.gamesPlayed > 0
      ? Math.round((profile.wins / profile.gamesPlayed) * 100)
      : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Hero Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 text-xs font-mono font-medium">
          <History className="w-3.5 h-3.5" />
          <span>Event Sourced &bull; Turn-Based &bull; Time-Travel Rewind</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
          Tic-Tac-Toe{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
            Reimagined
          </span>
        </h1>
        <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-400">
          Play against a mathematical Minimax AI or challenge a friend in real-time. Every turn is
          an immutable event in Firestore, allowing you to rewind and restore the board to any prior
          turn.
        </p>
      </div>

      {/* Profile Stats Bar (if signed in) */}
      {isSignedIn && profile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-center p-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Matches
            </span>
            <span className="text-xl font-mono font-bold text-slate-100">
              {profile.gamesPlayed}
            </span>
          </div>
          <div className="text-center p-2">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
              Wins
            </span>
            <span className="text-xl font-mono font-bold text-emerald-400">{profile.wins}</span>
          </div>
          <div className="text-center p-2">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
              Losses
            </span>
            <span className="text-xl font-mono font-bold text-rose-400">{profile.losses}</span>
          </div>
          <div className="text-center p-2">
            <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block">
              Win Rate
            </span>
            <span className="text-xl font-mono font-bold text-cyan-400">{winRate}%</span>
          </div>
        </div>
      )}

      {/* Main Mode Selection Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Tab selection */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Play vs AI</span>
          </button>
          <button
            onClick={() => setActiveTab('multiplayer')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'multiplayer'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Play with Friend</span>
          </button>
        </div>

        {/* Tab 1: AI Match Config */}
        {activeTab === 'ai' && (
          <div className="space-y-6 max-w-lg mx-auto">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3 text-center">
                Select Minimax Algorithm Difficulty
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Unbeatable */}
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('unbeatable')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedDifficulty === 'unbeatable'
                      ? 'bg-cyan-950/60 border-cyan-400 text-white ring-2 ring-cyan-500/30'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-cyan-300">Unbeatable</span>
                    <Cpu className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Full Minimax tree depth. Guaranteed never to lose.
                  </p>
                </button>

                {/* Medium */}
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('medium')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedDifficulty === 'medium'
                      ? 'bg-indigo-950/60 border-indigo-400 text-white ring-2 ring-indigo-500/30'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-indigo-300">Master</span>
                    <Zap className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Smart strategy with occasional tactical openings.
                  </p>
                </button>

                {/* Easy */}
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('easy')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedDifficulty === 'easy'
                      ? 'bg-emerald-950/60 border-emerald-400 text-white ring-2 ring-emerald-500/30'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-emerald-300">Apprentice</span>
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Casual play. Great for testing time-travel rewind.
                  </p>
                </button>
              </div>
            </div>

            <button
              onClick={() => onStartAiGame(selectedDifficulty)}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{isLoading ? 'Creating Match...' : 'Start Match vs Minimax AI'}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Multiplayer Matchmaking */}
        {activeTab === 'multiplayer' && (
          <div className="space-y-6 max-w-lg mx-auto">
            {/* Create Room */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create New Match</h3>
                  <p className="text-xs text-slate-400">Generate a short code to send to a friend</p>
                </div>
              </div>
              <button
                onClick={onCreateMultiplayerGame}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating...' : 'Create Match & Get Share Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Join Room */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Join Existing Match</h3>
                  <p className="text-xs text-slate-400">Enter your friend's 6-character game code</p>
                </div>
              </div>
              <form onSubmit={handleJoinSubmit} className="flex gap-2">
                <input
                  type="text"
                  maxLength={12}
                  placeholder="e.g. 8X2K9P"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono tracking-widest text-slate-100 uppercase focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim() || isLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-40"
                >
                  <span>Join</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-2.5">
            <History className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-200 mb-1">Event Sourced Log</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every move and state transition is stored as an immutable event in a Firestore
            subcollection.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-2.5">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-200 mb-1">Time-Travel Rewind</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Scrub back to any historical turn. Choose to restore the live game state to that exact
            moment.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-2.5">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-200 mb-1">Algorithmic Minimax AI</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Pure client-side tree search without external LLM calls. Select between three difficulty
            levels.
          </p>
        </div>
      </div>
    </div>
  );
};
