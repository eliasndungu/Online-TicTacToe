# Security Specification & Test Payloads

## 1. Data Invariants
1. **Match Identity**: The creator of a game is player X (`playerXId == request.auth.uid`). Player X cannot be changed once created.
2. **Player Participation**: Only Player X and Player O (or an open slot for Player O in multiplayer waiting games) can write/join. A non-participant cannot alter game state or moves.
3. **Turn Integrity**: A player can only commit a MOVE event if it is their assigned turn (`currentTurn == player`), and they can only submit their own moves (`playerId == request.auth.uid` or authorized AI opponent moves).
4. **Board Invariant**: A move must be on an unoccupied cell (0-8). Replaying the event stream must reproduce the identical board state.
5. **Rollback Invariant**: Rollback actions must reference a valid prior turn number (`0 <= targetTurnNumber < currentTurnNumber`) and can only be performed by active match participants.
6. **Subcollection Master Gate**: Events under `/games/{gameId}/events/{eventId}` are only accessible if the parent game exists and the user is a participant (or public spectator).
7. **Terminal State**: Finished games cannot have additional moves added unless a valid rollback is executed by a participant.
8. **Size & Type Bounds**: Document IDs, user IDs, strings, and event arrays are strictly bounded to prevent Denial-of-Wallet attacks.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Ghost Field Injection / Shadow Update)**:
   Attempting to update game with unapproved field `isSuperAdmin: true`.
   ```json
   {
     "status": "completed",
     "isSuperAdmin": true
   }
   ```
2. **Payload 2 (Impersonation / Spoofed Player X)**:
   Creating a game where `playerXId` is set to someone else's UID (`attacker_uid != victim_uid`).
   ```json
   {
     "id": "game_123",
     "shortCode": "HACK99",
     "mode": "ai",
     "playerXId": "victim_uid_456",
     "playerXName": "Victim",
     "status": "waiting",
     "winner": "none",
     "currentTurn": "X",
     "totalEvents": 0
   }
   ```
3. **Payload 3 (OutOfTurn Move Execution)**:
   Player O submitting a move when `currentTurn` is `'X'`.
   ```json
   {
     "type": "MOVE",
     "player": "O",
     "playerId": "player_o_uid",
     "cellIndex": 4
   }
   ```
4. **Payload 4 (Invalid Cell Index / Out of Bounds)**:
   Submitting a move with cell index `99` (board only allows 0..8).
   ```json
   {
     "type": "MOVE",
     "player": "X",
     "playerId": "player_x_uid",
     "cellIndex": 99
   }
   ```
5. **Payload 5 (Rollback to Negative / Invalid Turn)**:
   Submitting a rollback to `targetTurnNumber: -5`.
   ```json
   {
     "type": "ROLLBACK",
     "targetTurnNumber": -5,
     "requestedBy": "player_x_uid"
   }
   ```
6. **Payload 6 (Unauthorized Spectator Move)**:
   User `random_user_99` attempting to post a move into a private two-player game they are not part of.
   ```json
   {
     "type": "MOVE",
     "player": "X",
     "playerId": "random_user_99",
     "cellIndex": 0
   }
   ```
7. **Payload 7 (Unbounded String / Denial of Wallet)**:
   Attempting to set `playerXName` to a 50KB payload.
   ```json
   {
     "playerXName": "A".repeat(50000)
   }
   ```
8. **Payload 8 (Arbitrary Game Outcome Override)**:
   Non-turn player directly modifying `winner: "O"` without valid event progression.
   ```json
   {
     "winner": "O",
     "status": "completed"
   }
   ```
9. **Payload 9 (Profile PII Hijack)**:
   Modifying another user's public profile `/users/other_user_id/public/profile`.
   ```json
   {
     "wins": 999999
   }
   ```
10. **Payload 10 (Path Poisoning / Invalid Document ID)**:
    Creating a game with doc ID containing script injection `../../admin/override`.
    ```json
    { "id": "../../admin/override" }
    ```
11. **Payload 11 (Unverified Email Write)**:
    User with `email_verified: false` attempting to create ranked multiplayer matches.
12. **Payload 12 (Post-Terminal Move Addition)**:
    Adding a `MOVE` event to a game whose status is already `completed`.
