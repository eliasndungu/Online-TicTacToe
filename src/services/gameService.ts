/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Game, GameEvent, GameMode, AIDifficulty, PlayerMark, UserProfile } from '../types/game';
import { reconstructState } from './eventSourcing';
import { checkBoardWinner } from './minimax';

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Creates a new Game match in Firestore
 */
export async function createGame(
  mode: GameMode,
  difficulty: AIDifficulty = 'unbeatable'
): Promise<Game> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to create a game');

  const gameId = 'game_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const shortCode = generateShortCode();
  const now = new Date().toISOString();

  const isAi = mode === 'ai';

  const newGame: Game = {
    id: gameId,
    shortCode,
    mode,
    aiDifficulty: isAi ? difficulty : 'unbeatable',
    playerXId: user.uid,
    playerXName: user.displayName || 'Player X',
    playerXPhoto: user.photoURL || '',
    playerOId: isAi ? 'ai' : null,
    playerOName: isAi ? `Minimax AI (${difficulty})` : '',
    playerOPhoto: isAi ? 'https://api.dicebear.com/7.x/bottts/svg?seed=' + difficulty : '',
    status: isAi ? 'in_progress' : 'waiting',
    winner: 'none',
    winningLine: null,
    currentTurn: 'X',
    totalEvents: 0,
    createdAt: now,
    updatedAt: now,
  };

  const gameRef = doc(db, 'games', gameId);
  try {
    await setDoc(gameRef, newGame);
    return newGame;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `games/${gameId}`);
  }
}

/**
 * Looks up a game by shortCode or ID
 */
export async function findGameByCodeOrId(identifier: string): Promise<Game | null> {
  const trimmed = identifier.trim().toUpperCase();
  const path = 'games';

  // 1. Try finding by shortCode
  try {
    const q = query(collection(db, path), where('shortCode', '==', trimmed));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as Game;
    }
  } catch (error) {
    // Continue to ID check if error is not fatal
    console.warn('ShortCode query check error:', error);
  }

  // 2. Try finding by exact document ID
  try {
    const docRef = doc(db, 'games', identifier.trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Game;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `games/${identifier}`);
  }

  return null;
}

/**
 * Join an existing waiting match as Player O
 */
export async function joinGame(gameId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to join a game');

  const gameRef = doc(db, 'games', gameId);
  const now = new Date().toISOString();

  try {
    await updateDoc(gameRef, {
      playerOId: user.uid,
      playerOName: user.displayName || 'Player O',
      playerOPhoto: user.photoURL || '',
      status: 'in_progress',
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}`);
  }
}

/**
 * Submits a MOVE event to the game's event subcollection and updates parent game state
 */
export async function submitMove(
  game: Game,
  cellIndex: number,
  player: PlayerMark,
  currentEvents: GameEvent[]
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be signed in to move');

  // Verify cell is valid 0-8
  if (cellIndex < 0 || cellIndex > 8) throw new Error('Invalid cell');

  const now = new Date().toISOString();
  const nextSequence = (game.totalEvents || currentEvents.length) + 1;

  // Replay existing events to know current turnNumber
  const reconstructed = reconstructState(currentEvents);
  const nextTurnNumber = reconstructed.turnCount + 1;

  const eventId = 'evt_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const moveEvent: GameEvent = {
    id: eventId,
    gameId: game.id,
    type: 'MOVE',
    sequence: nextSequence,
    turnNumber: nextTurnNumber,
    player,
    playerId: player === 'X' ? game.playerXId : (game.playerOId || user.uid),
    cellIndex,
    targetTurnNumber: -1,
    createdAt: now,
  };

  // Replay with new event to determine next game state
  const postReplay = reconstructState([...currentEvents, moveEvent]);
  const isFinished = postReplay.winner !== 'none';

  const eventRef = doc(db, 'games', game.id, 'events', eventId);
  const gameRef = doc(db, 'games', game.id);

  try {
    // 1. Commit event to subcollection
    await setDoc(eventRef, moveEvent);

    // 2. Update game document
    await updateDoc(gameRef, {
      totalEvents: nextSequence,
      currentTurn: postReplay.currentTurn,
      winner: postReplay.winner,
      winningLine: postReplay.winningLine || null,
      status: isFinished ? 'completed' : 'in_progress',
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${game.id}/events/${eventId}`);
  }
}

/**
 * Submits a ROLLBACK event to restore the game to a historical turn
 */
export async function submitRollback(
  game: Game,
  targetTurnNumber: number,
  currentEvents: GameEvent[]
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be signed in to rollback');

  const now = new Date().toISOString();
  const nextSequence = (game.totalEvents || currentEvents.length) + 1;

  const eventId = 'evt_roll_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const rollbackEvent: GameEvent = {
    id: eventId,
    gameId: game.id,
    type: 'ROLLBACK',
    sequence: nextSequence,
    turnNumber: targetTurnNumber,
    player: 'system',
    playerId: user.uid,
    cellIndex: -1,
    targetTurnNumber,
    createdAt: now,
  };

  // Replay post-rollback state
  const postReplay = reconstructState([...currentEvents, rollbackEvent]);

  const eventRef = doc(db, 'games', game.id, 'events', eventId);
  const gameRef = doc(db, 'games', game.id);

  try {
    // 1. Record rollback event in subcollection
    await setDoc(eventRef, rollbackEvent);

    // 2. Synchronize game document state
    await updateDoc(gameRef, {
      totalEvents: nextSequence,
      currentTurn: postReplay.currentTurn,
      winner: postReplay.winner,
      winningLine: postReplay.winningLine || null,
      status: 'in_progress',
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${game.id}/events/${eventId}`);
  }
}

/**
 * Subscribes to live updates for a single game document
 */
export function subscribeToGame(
  gameId: string,
  onUpdate: (game: Game | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `games/${gameId}`;
  const docRef = doc(db, 'games', gameId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as Game);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Subscribes to live events subcollection under games/{gameId}/events
 */
export function subscribeToGameEvents(
  gameId: string,
  onUpdate: (events: GameEvent[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `games/${gameId}/events`;
  const eventsQuery = query(collection(db, 'games', gameId, 'events'), orderBy('sequence', 'asc'));

  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      const events: GameEvent[] = snapshot.docs.map((docSnap) => docSnap.data() as GameEvent);
      onUpdate(events);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Fetches user profile or creates initial if not found
 */
export async function getOrCreateUserProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const path = `users/${user.uid}/public/profile`;
  const profileRef = doc(db, 'users', user.uid, 'public', 'profile');

  try {
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const newProfile: UserProfile = {
      id: user.uid,
      displayName: user.displayName || 'Player',
      photoURL: user.photoURL || '',
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(profileRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Records match outcome in user profile
 */
export async function recordGameStats(result: 'win' | 'loss' | 'draw'): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const path = `users/${user.uid}/public/profile`;
  const profileRef = doc(db, 'users', user.uid, 'public', 'profile');

  try {
    const snap = await getDoc(profileRef);
    if (!snap.exists()) return;
    const current = snap.data() as UserProfile;

    await updateDoc(profileRef, {
      gamesPlayed: (current.gamesPlayed || 0) + 1,
      wins: (current.wins || 0) + (result === 'win' ? 1 : 0),
      losses: (current.losses || 0) + (result === 'loss' ? 1 : 0),
      draws: (current.draws || 0) + (result === 'draw' ? 1 : 0),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
