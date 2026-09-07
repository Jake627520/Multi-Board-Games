# Change 010: Banqi Rules & Hidden Information Audit (010-banqi-rules-audit)

## 1. Problem Statement
Banqi introduces hidden information (face-down pieces) and stochastic elements to the Multi Board Games Platform. While initial implementation and tests passed in Round 8, two critical architectural questions must be audited and locked down:
1. **Information Security**: Standard `JSON.stringify(state)` serializes the full board, exposing the true identity (`player`, `type`, `rank`) of face-down pieces to spectators, network clients, or external callers.
2. **Rule Correctness & Living Spec Locking**: Traditional Taiwanese Banqi rules (pawn-king mutual rules, cannon single-screen jump capture, face-down immunity, first-flip side assignment, and stalemate/wipeout victory conditions) must be formally codified and covered by regression-proof tests.

## 2. Proposed Change
1. **Hidden State Masking (`src/games/banqi/rules.ts` & `src/games/banqi/engine.ts`)**:
   - Introduce `maskHiddenState(state: BanqiState): BanqiState` which sanitizes face-down pieces, replacing identity fields with a masked placeholder (`type: "unknown"`, `player: "unknown"`, `rank: 0`).
   - Introduce `serializeMasked(state: BanqiState): string` for client/spectator/storage consumption.
2. **Rule Audit & Invariant Enforcement**:
   - Verify face-down piece complete immunity from all captures (including cannon jump).
   - Verify first-flip side determination and immediate alternation of turns.
   - Verify complete rank hierarchy ($7 \dots 1$), with Soldier $\rightarrow$ General capture and General $\rightarrow$ Soldier immunity.
   - Verify Cannon jumps over exactly 1 intervening piece.
   - Verify undo preserves hidden state integrity and restores face-down status.
3. **Comprehensive Audit Test Suite (`tests/banqi/audit.test.ts`)**:
   - Explicitly verify each P0/P1 audit requirement.

## 3. Non-Goals
- No Banqi AI.
- No new game engines.
- No network multiplayer implementation.

## 4. Acceptance Criteria
- `maskHiddenState` produces a clean view where no face-down piece reveals its true identity.
- Face-down pieces are 100% immune from all attacks.
- Undoing a flip restores `isRevealed: false` without altering true identity.
- Full Vitest suite passes with zero regressions.
