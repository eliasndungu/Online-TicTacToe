/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { auth, signInWithGoogle } from './services/firebase';
import {
  Game,
  GameEvent,
  PlayerMark,
  AIDifficulty,
  UserProfile,
  ReconstructedGameState,
} from './types/game';
import {
  createGame,
  findGameByCodeOrId,
  joinGame,
  submitMove,
  submitRollback,
  subscribeToGame,
  subscribeToGameEvents,
  getOrCreateUserProfile,
  recordGameStats,
} from './services/gameService';
import { reconstructState, getSnapshotForTurn } from './services/eventSourcing';
import { getBestAIMove } from './services/minimax';
import { sound } from './services/sound';
import { Navbar } from './components/Navbar';
import { MatchLobby } from './components/MatchLobby';
import { Board } from './components/Board';
import { TimelineScrubber } from './components/TimelineScrubber';
import { ShareModal } from './components/ShareModal';
import { RollbackModal } from './components/RollbackModal';
import {
  Share2,
  RotateCcw,
  Home,
  Users,
  Bot,
  AlertCircle,
  LogIn,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Active game & events
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & previews
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [rollbackTargetTurn, setRollbackTargetTurn] = useState<number | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [selectedTurn, setSelectedTurn] = useState<number>(0);

  // Ref to prevent double-AI moves
  const aiProcessingRef = useRef(false);
  const lastWinnerAnnouncedRef = useRef<string | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        try {
          const userProf = await getOrCreateUserProfile();
          setProfile(userProf);
        } catch (e) {
          console.error('Error fetching user profile:', e);
        }
      } else {
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Check URL parameters for ?match=CODE or ?game=ID on mount
  useEffect(() => {
    if (isAuthLoading) return;
    const urlParams = new URLSearchParams(window.location.search);
    const matchCode = urlParams.get('match') || urlParams.get('game');
    if (matchCode && !activeGame) {
      handleJoinMatch(matchCode);
    }
  }, [isAuthLoading]);

  // 3. Subscriptions to Active Game and Subcollection Events
  useEffect(() => {
    if (!activeGame?.id) return;

    const unsubGame = subscribeToGame(
      activeGame.id,
      (updatedGame) => {
        if (updatedGame) {
          setActiveGame(updatedGame);
        } else {
          setErrorMessage('This match was not found or has been removed.');
          setActiveGame(null);
        }
      },
      (err) => console.error('Game sync error:', err)
    );

    const unsubEvents = subscribeToGameEvents(
      activeGame.id,
      (events) => {
        setGameEvents(events);
      },
      (err) => console.error('Events sync error:', err)
    );

    return () => {
      unsubGame();
      unsubEvents();
    };
  }, [activeGame?.id]);

  // 4. Reconstruct state by replaying all events from subcollection
  const reconstructed: ReconstructedGameState = useMemo(() => {
    return reconstructState(gameEvents);
  }, [gameEvents]);

  // Sync selectedTurn to latest turn when new live moves occur, unless user is intentionally previewing
  const liveTurn = reconstructed.turnCount;
  const isPreviewingHistory = selectedTurn < liveTurn;

  useEffect(() => {
    // Whenever live turn changes (e.g. move made), default preview to live turn
    setSelectedTurn(liveTurn);
  }, [liveTurn]);

  // Active displayed board (either live or historical preview)
  const displayedSnapshot = useMemo(() => {
    if (isPreviewingHistory) {
      return getSnapshotForTurn(reconstructed.historySnapshots, selectedTurn) || reconstructed.historySnapshots[0];
    }
    return (
      reconstructed.historySnapshots[reconstructed.historySnapshots.length - 1] ||
      reconstructed.historySnapshots[0]
    );
  }, [isPreviewingHistory, selectedTurn, reconstructed]);

  const displayedBoard = displayedSnapshot.board;
  const displayedWinningLine = isPreviewingHistory ? displayedSnapshot.winningLine : reconstructed.winningLine;
  const displayedWinner = isPreviewingHistory ? displayedSnapshot.winner : reconstructed.winner;

  // Determine current user's role/mark
  const myMark: PlayerMark | null = useMemo(() => {
    if (!user || !activeGame) return null;
    if (user.uid === activeGame.playerXId) return 'X';
    if (user.uid === activeGame.playerOId) return 'O';
    return null;
  }, [user, activeGame]);

  const isMyTurn = useMemo(() => {
    if (!myMark || !activeGame || activeGame.status !== 'in_progress') return false;
    return reconstructed.currentTurn === myMark;
  }, [myMark, activeGame, reconstructed.currentTurn]);

  // 5. Sound & Celebration effect on game completion
  useEffect(() => {
    if (!activeGame) return;
    if (reconstructed.winner !== 'none' && lastWinnerAnnouncedRef.current !== reconstructed.winner) {
      lastWinnerAnnouncedRef.current = reconstructed.winner;
      if (reconstructed.winner === 'draw') {
        sound.playDraw();
        if (myMark) recordGameStats('draw');
      } else {
        if (reconstructed.winner === myMark) {
          sound.playWin();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
          recordGameStats('win');
        } else {
          sound.playDraw();
          if (myMark) recordGameStats('loss');
        }
      }
      // Refresh stats
      getOrCreateUserProfile().then((p) => p && setProfile(p));
    } else if (reconstructed.winner === 'none') {
      lastWinnerAnnouncedRef.current = null;
    }
  }, [reconstructed.winner, activeGame?.id, myMark]);

  // 6. Minimax AI Turn Trigger
  useEffect(() => {
    if (
      !activeGame ||
      activeGame.mode !== 'ai' ||
      activeGame.status !== 'in_progress' ||
      reconstructed.winner !== 'none' ||
      reconstructed.currentTurn !== 'O' ||
      aiProcessingRef.current
    ) {
      return;
    }

    aiProcessingRef.current = true;
    setIsAiThinking(true);

    const timer = setTimeout(async () => {
      try {
        const bestMove = getBestAIMove(
          reconstructed.board,
          'O',
          activeGame.aiDifficulty || 'unbeatable'
        );

        if (bestMove !== null) {
          await submitMove(activeGame, bestMove, 'O', gameEvents);
          sound.playMove('O');
        }
      } catch (err) {
        console.error('AI move execution failed:', err);
      } finally {
        setIsAiThinking(false);
        aiProcessingRef.current = false;
      }
    }, 550);

    return () => clearTimeout(timer);
  }, [
    activeGame?.id,
    activeGame?.mode,
    activeGame?.status,
    activeGame?.aiDifficulty,
    reconstructed.currentTurn,
    reconstructed.winner,
    reconstructed.turnCount,
    gameEvents,
  ]);

  // Match Actions
  const handleStartAiGame = async (difficulty: AIDifficulty) => {
    if (!user) {
      try {
        await signInWithGoogle();
      } catch {
        return;
      }
    }
    try {
      setIsGameLoading(true);
      setErrorMessage(null);
      const game = await createGame('ai', difficulty);
      setActiveGame(game);
      setGameEvents([]);
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not initialize AI game. Please try again.');
    } finally {
      setIsGameLoading(false);
    }
  };

  const handleCreateMultiplayerGame = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
      } catch {
        return;
      }
    }
    try {
      setIsGameLoading(true);
      setErrorMessage(null);
      const game = await createGame('multiplayer');
      setActiveGame(game);
      setGameEvents([]);
      setIsShareModalOpen(true);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to create match room.');
    } finally {
      setIsGameLoading(false);
    }
  };

  const handleJoinMatch = async (codeOrId: string) => {
    try {
      setIsGameLoading(true);
      setErrorMessage(null);
      const game = await findGameByCodeOrId(codeOrId);
      if (!game) {
        setErrorMessage(`No match found with code "${codeOrId}".`);
        return;
      }
      setActiveGame(game);
    } catch (err) {
      console.error(err);
      setErrorMessage('Error finding match.');
    } finally {
      setIsGameLoading(false);
    }
  };

  const handleJoinAsPlayerO = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
      } catch {
        return;
      }
    }
    if (!activeGame) return;

    try {
      setIsGameLoading(true);
      await joinGame(activeGame.id);
    } catch (err) {
      console.error('Failed to join:', err);
      setErrorMessage('Failed to join match.');
    } finally {
      setIsGameLoading(false);
    }
  };

  const handleCellClick = async (cellIndex: number) => {
    if (!activeGame || !myMark || isPreviewingHistory || isAiThinking) return;
    try {
      await submitMove(activeGame, cellIndex, myMark, gameEvents);
      sound.playMove(myMark);
    } catch (err) {
      console.error('Move failed:', err);
    }
  };

  const handleConfirmRollback = async () => {
    if (!activeGame || rollbackTargetTurn === null) return;
    try {
      await submitRollback(activeGame, rollbackTargetTurn, gameEvents);
      sound.playRollback();
      setSelectedTurn(rollbackTargetTurn);
      setRollbackTargetTurn(null);
    } catch (err) {
      console.error('Rollback failed:', err);
      setErrorMessage('Failed to rollback match.');
    }
  };

  const handleExitMatch = () => {
    setActiveGame(null);
    setGameEvents([]);
    // Clean URL query
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navbar */}
      <Navbar
        user={user}
        profile={profile}
        onHomeClick={handleExitMatch}
        activeGameId={activeGame?.id || null}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Error Notification Toast */}
        {errorMessage && (
          <div className="w-full max-w-md mb-6 p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="px-2 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-rose-100 text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View 1: Match Lobby */}
        {!activeGame && (
          <MatchLobby
            onStartAiGame={handleStartAiGame}
            onCreateMultiplayerGame={handleCreateMultiplayerGame}
            onJoinGame={handleJoinMatch}
            profile={profile}
            isSignedIn={!!user}
            onSignIn={signInWithGoogle}
            isLoading={isGameLoading}
          />
        )}

        {/* View 2: Active Game Match */}
        {activeGame && (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-fade-in py-2">
            {/* Top Match Bar */}
            <div className="w-full flex items-center justify-between mb-4 px-2">
              <button
                onClick={handleExitMatch}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Lobby</span>
              </button>

              <div className="flex items-center gap-2">
                {activeGame.mode === 'multiplayer' && (
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 px-3 py-1.5 rounded-xl border border-cyan-800/60 shadow-sm transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Code: {activeGame.shortCode}</span>
                  </button>
                )}

                <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                  {activeGame.mode === 'ai'
                    ? `Minimax (${activeGame.aiDifficulty})`
                    : 'Multiplayer'}
                </div>
              </div>
            </div>

            {/* Waiting for Opponent Prompt in Multiplayer */}
            {activeGame.mode === 'multiplayer' && activeGame.status === 'waiting' && (
              <div className="w-full mb-6 p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 to-slate-900 border border-indigo-800/50 text-center shadow-xl">
                <Users className="w-8 h-8 text-indigo-400 mx-auto mb-2 animate-bounce" />
                <h3 className="text-sm font-bold text-indigo-100 mb-1">
                  Waiting for an opponent to join...
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto mb-4">
                  Share the 6-character code{' '}
                  <span className="font-mono font-bold text-cyan-400 px-1 py-0.5 bg-slate-950 rounded">
                    {activeGame.shortCode}
                  </span>{' '}
                  or invite link with a friend to begin.
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Invite Friend</span>
                  </button>
                  {/* Join as Player O if viewing as non-creator */}
                  {user && user.uid !== activeGame.playerXId && (
                    <button
                      onClick={handleJoinAsPlayerO}
                      disabled={isGameLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-transform active:scale-95"
                    >
                      <span>Join as Player O</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Non-participant Spectator Join Banner */}
            {activeGame.mode === 'multiplayer' &&
              activeGame.status === 'waiting' &&
              !myMark &&
              user && (
                <div className="w-full mb-4 p-3 bg-cyan-950/60 border border-cyan-800 rounded-2xl flex items-center justify-between">
                  <span className="text-xs text-cyan-200">
                    You have arrived at match {activeGame.shortCode}. Join as Player O to start!
                  </span>
                  <button
                    onClick={handleJoinAsPlayerO}
                    className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl"
                  >
                    Join Match
                  </button>
                </div>
              )}

            {/* 3x3 Board */}
            <Board
              board={displayedBoard}
              winningLine={displayedWinningLine}
              winner={displayedWinner}
              currentTurn={displayedSnapshot.currentTurn}
              isMyTurn={isMyTurn}
              myMark={myMark}
              isPreviewingHistory={isPreviewingHistory}
              previewTurnNumber={selectedTurn}
              totalTurns={liveTurn}
              onCellClick={handleCellClick}
              onExitPreview={() => setSelectedTurn(liveTurn)}
              onOpenRollbackModal={() => setRollbackTargetTurn(selectedTurn)}
              isAiThinking={isAiThinking}
              game={activeGame}
            />

            {/* Time-Travel Event Sourcing Timeline Scrubber */}
            <TimelineScrubber
              snapshots={reconstructed.historySnapshots}
              allEvents={reconstructed.allEvents}
              selectedTurn={selectedTurn}
              liveTurn={liveTurn}
              onSelectTurn={(turn) => setSelectedTurn(turn)}
              onOpenRollbackModal={(turn) => setRollbackTargetTurn(turn)}
              canRollback={
                activeGame.status === 'in_progress' || activeGame.status === 'completed'
              }
            />
          </div>
        )}
      </main>

      {/* Share Modal */}
      {activeGame && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shortCode={activeGame.shortCode}
          gameId={activeGame.id}
        />
      )}

      {/* Rollback Confirmation Modal */}
      {activeGame && rollbackTargetTurn !== null && (
        <RollbackModal
          isOpen={true}
          onClose={() => setRollbackTargetTurn(null)}
          onConfirm={handleConfirmRollback}
          targetTurnNumber={rollbackTargetTurn}
          liveTurnNumber={liveTurn}
          isAiMatch={activeGame.mode === 'ai'}
        />
      )}
    </div>
  );
}
