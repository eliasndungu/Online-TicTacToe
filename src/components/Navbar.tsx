/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types/game';
import { signInWithGoogle, signOutUser } from '../services/firebase';
import { sound } from '../services/sound';
import { Volume2, VolumeX, LogIn, LogOut, Trophy, History, RefreshCw, UserCheck } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  profile: UserProfile | null;
  onHomeClick: () => void;
  activeGameId: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  profile,
  onHomeClick,
  activeGameId,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleToggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error(err);
    }
  };

  const winRate =
    profile && profile.gamesPlayed > 0
      ? Math.round((profile.wins / profile.gamesPlayed) * 100)
      : 0;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          onClick={onHomeClick}
          className="flex items-center gap-3 group text-left transition-transform active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 text-lg">
                #
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 tracking-tight text-lg group-hover:text-cyan-400 transition-colors">
                Chronos
              </span>
              <span className="text-xs uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 font-mono font-semibold">
                Sourced
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Turn-based Tic-Tac-Toe with Event Rollback
            </p>
          </div>
        </button>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio toggle */}
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-colors"
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            aria-label="Sound toggle"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* User Profile / Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* Quick stats pill */}
              <button
                onClick={() => setShowStatsModal(!showStatsModal)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {profile?.wins || 0}W - {profile?.losses || 0}L
                </span>
                <span className="text-slate-500 font-mono">({winRate}%)</span>
              </button>

              {/* User avatar & dropdown button */}
              <div className="flex items-center gap-2 pl-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-indigo-500/50 ring-2 ring-indigo-500/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-200 hidden md:inline-block max-w-[120px] truncate">
                  {user.displayName?.split(' ')[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
