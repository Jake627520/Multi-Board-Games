# AI Opponent Specification

## 1. Scope & Purpose

This specification governs the computer opponent: the `AiPlayer` contract, **what the AI is allowed to observe**, when and how the hook calls it, what each game's two AIs are, and how randomness is injected.

**How to read this document.** Every Requirement and Scenario carries a `Source:` line (repository-relative `file:line`, checked against HEAD `1a564ba`). Changes `007`, `016`, `017` are historical — in particular `017-banqi-ai-level2/design.md` describes the AI receiving the full state, which is the **opposite** of what the code does now. If the code and this document disagree, the code is right.

**What this spec does not contain.** Win rates and head-to-head scores are *measurements*, not contracts, and are deliberately not stated here. The only strength guarantee written as a requirement is the one a test enforces (§7), and it is stated as such.

---

## 2. The `AiPlayer` Contract

### 2.1 Requirement: Interface

An AI is an object `{ id: string, name: string, selectMove(observation, legalMoves): Promise<Move> }`. The `Observation` type parameter is "what the AI can see" and is **not** necessarily the authoritative state: for perfect-information games (Xiangqi, Gomoku) it is equivalent to the state; for Banqi it must be the projected view with no face-down identities.

- **Source**: `src/core/ai/types.ts:1-10`, `src/core/game/types.ts:85` (re-export).

#### Scenario: Selecting a move
- **Given** an observation and a non-empty list of legal moves
- **When** `selectMove(observation, legalMoves)` resolves
- **Then** the result is a move the AI chose (all six AIs return an element of `legalMoves`).
- **Source**: `src/games/xiangqi/ai.ts:153-157,183-197`, `src/games/gomoku/ai.ts:119-123,341-346`, `src/games/banqi/ai.ts:114-125,220-224`.
- **Tests**: `tests/integration/ai-session-isolation.integration.test.ts:11`.

### 2.2 Requirement: No legal moves is an error

Every AI's `selectMove` throws `"No legal moves available"` when the legal-move list is empty.

- **Source**: `src/games/xiangqi/ai.ts:150,178`, `src/games/gomoku/ai.ts:118,335`, `src/games/banqi/ai.ts:109,214`.
- **Tests**: `tests/xiangqi/ai.test.ts:95`, `tests/gomoku/ai.test.ts:74`.

---

## 3. The Observation Boundary (hidden-information line)

### 3.1 Requirement: The hook gives the AI a projected view, not the authoritative state

When the AI is to move, `useGameSession` computes `engine.projectView(stateRef.current, { role: "player", player: aiColor })` and passes **that** to `aiPlayer.selectMove`, together with the current legal moves. The option type is `aiPlayer?: AiPlayer<ViewState, Move>`, so the compiler rejects an AI that wants the full state. For Banqi the view has no `player`, `type` or `rank` on face-down pieces.

- **Source**: `src/ui/hooks/useGameSession.ts:33-39` (option type and doc), `:333-340` (call site).
- **Tests**: `tests/ui/ai-observation-boundary.test.ts:19` (Banqi: spy AI receives hidden cells without `player` / `type` / `rank`), `:90` (Xiangqi: view equals state in content), `tests/integration/banqi-hidden-information.integration.test.ts:99`.

#### Scenario: Banqi AI turn
- **Given** a PvE Banqi game where it is the AI's turn and some pieces are face-down
- **When** the hook calls the AI
- **Then** every face-down cell the AI receives is `{ id: "hidden-r-c", isRevealed: false }`.
- **Source**: `src/ui/hooks/useGameSession.ts:333-340`, `src/games/banqi/rules.ts:335-339`.

#### Scenario: Xiangqi / Gomoku AI turn
- **Given** a Xiangqi or Gomoku game
- **When** the hook calls the AI
- **Then** the observation is a copy of the state (`projectView` returns the state with the board copied) — there is nothing hidden.
- **Source**: `src/games/xiangqi/engine.ts:24`, `src/games/gomoku/engine.ts:26`.

### 3.2 Requirement: The legal-move list carries no hidden identity

The legal moves handed to the AI are computed from the authoritative state, but a Banqi move contains only coordinates (`flip` position, or `from`/`to`), never identities. Which cells are face-down is public.

- **Source**: `src/ui/hooks/useGameSession.ts:87-88,105-106`, `src/games/banqi/types.ts:14-16`.

### 3.3 Requirement: The Banqi AIs do not read face-down identity even if given it

Both Banqi AIs read a piece's `player` / `type` / `rank` only when `isRevealed === true`. Level 1 fills in face-down cells with a *guess* (determinization) drawn from the pieces not visible on the board; Level 2 does not guess at all and only reads revealed pieces. Both accept either a view or a full state as `observation` (`BanqiObservation`), and neither changes behaviour when handed a full state.

- **Source**: `src/games/banqi/determinize.ts:11-16,53-67,87-127` (hidden cells never read at 58-59 and 104-106; guess ids are `det-r-c` at 109), `src/games/banqi/ai.ts:111,173-179,216-217`.
- **Tests**: `tests/banqi/ai-blind.test.ts:47,67,88,125-171`, `tests/banqi/ai-blind.test.ts:88` (same decision for the same seed after shuffling hidden identities, including when handed a full state).

#### Scenario: Shuffling the hidden identities
- **Given** two full states identical except for which real pieces lie under the face-down cells, and the same AI seed
- **When** the Banqi AI selects a move from each
- **Then** it selects the same move.
- **Source**: `src/games/banqi/determinize.ts:58-59,104-117`.
- **Tests**: `tests/banqi/ai-blind.test.ts:88`.

### 3.4 Requirement: Determinization draws from "full set minus visible pieces"

`unseenPieces(observation)` is the 32-piece multiset (per side: 1 general, 2 advisors, 2 elephants, 2 chariots, 2 horses, 2 cannons, 5 soldiers) minus every revealed piece currently on the board. `determinize` shuffles it with the injected RNG and fills the face-down cells. It carries no `positionHistory` / `nonProgressCount` (the view has none).

- **Source**: `src/games/banqi/determinize.ts:18-27,34-42,44-67,77-127`.
- **Tests**: `tests/banqi/ai-blind.test.ts:126,143,162,171`.

#### Scenario: Opening
- **Given** a fresh game (all cells face-down)
- **Then** `unseenPieces` is the complete 32-piece multiset.
- **Source**: `src/games/banqi/determinize.ts:53-67`.
- **Tests**: `tests/banqi/ai-blind.test.ts:126`.

---

## 4. When and How the Hook Calls the AI

### 4.1 Requirement: Trigger conditions

The AI is scheduled when **all** hold: not in replay mode; an `aiPlayer` and an `aiColor` are set (PvE); the game is not over; `currentPlayer === aiColor`. It runs after `aiDelayMs` (default 400 ms), then the chosen move is applied through `session.move` (so it goes through the same legality check as a human move) and the new state is set.

- **Source**: `src/ui/hooks/useGameSession.ts:91-93` (options, default delay), `:325-372` (effect; conditions at 327-328, delay at 356, application at 342-346).

#### Scenario: Human to move
- **Given** PvE and `currentPlayer !== aiColor`
- **Then** the effect schedules nothing.
- **Source**: `src/ui/hooks/useGameSession.ts:328`.

### 4.2 Requirement: Cancellation and errors

The scheduled call is cancelled (its result ignored, its timer cleared) whenever any effect dependency changes or the component unmounts. If `selectMove` or the move application throws, the hook sets the error message (`AI 走步失敗` as a fallback) and clears the thinking flag; an illegal AI move is rejected by `session.move` (`Illegal move`).

- **Source**: `src/ui/hooks/useGameSession.ts:330-360` (`cancelled` flag, `clearTimeout`), `:347-355` (error and `finally`), `src/core/game/session.ts:80-84` (legality).

#### Scenario: Leaving the board while the AI thinks
- **Given** the AI is thinking
- **When** the component unmounts or the replay mode toggles
- **Then** its result is discarded and no move is applied.
- **Source**: `src/ui/hooks/useGameSession.ts:341,357-360`.

### 4.3 Requirement: Human input is blocked while the AI is thinking

While `isAiThinking`, `move()` and `undo()` return without effect, and the Banqi board ignores clicks when it is the AI's turn.

- **Source**: `src/ui/hooks/useGameSession.ts:113-114,127-128`, `src/ui/components/BanqiBoard.tsx:145-146`.

### 4.4 Requirement: Undo in PvE rewinds to the human's decision point

In PvE, `undo()` rewinds history until it is no longer the AI's turn (or history is empty); in PvP it removes exactly one move.

- **Source**: `src/ui/hooks/useGameSession.ts:127-150` (PvE loop at 141-147).
- **Tests**: `tests/ui/pve-session.test.ts:96,185`.

#### Scenario: Undo after the AI replied
- **Given** PvE, the human moved and the AI answered
- **When** undo is pressed
- **Then** both the AI's move and the human's move are removed.
- **Source**: `src/ui/hooks/useGameSession.ts:141-147`.

---

## 5. Seats and Opponent Selection per Game

### 5.1 Requirement: PvE seat mapping

- Xiangqi: human colour is `humanPlayer` (red by default); the AI plays the other colour.
- Gomoku: human colour is `humanPlayer` (black by default); the AI plays the other colour.
- Banqi: `humanPlayer` denotes the **seat**, not a colour, until the first flip (`"red"` = "先手, player flips first", `"black"` = "後手, computer flips first"). Before the first flip the AI is the other seat; after the first flip the AI plays the colour that is not the human's, derived from `viewState.player1Color`.

- **Source**: `src/ui/XiangqiBoard.tsx:42-43`, `src/ui/components/GomokuBoard.tsx:53-54`, `src/ui/components/BanqiBoard.tsx:38-41,64,71-79,108-111`.

#### Scenario: Banqi, computer moves first
- **Given** PvE with `humanPlayer === "black"` (電腦先翻) and no flip yet
- **Then** `aiColor` is the first-mover seat and the AI makes the first flip.
- **Source**: `src/ui/components/BanqiBoard.tsx:71-75`.

### 5.2 Requirement: Two opponents per game, chosen in the UI

Each game offers two AIs, selected by `aiLevel` (`"l1"` | `"l2"`) when the mode is PvE; the choice is stored in the autosave UI settings. Switching the opponent mid-game keeps the game and its history (no reset).

- **Source**: `src/ui/XiangqiBoard.tsx:33-37`, `src/ui/components/GomokuBoard.tsx:36,49-51`, `src/ui/components/BanqiBoard.tsx:63,66-69,180-186`, `src/ui/components/BoardSidePanel.tsx:160-168`, `src/ui/components/AiLevelSelector.tsx:1-64`.
- **Tests**: `tests/ui/ai-level-preserves-game.test.ts:35,52,62`.

#### Scenario: Switching the opponent
- **Given** a PvE game with moves played
- **When** the user switches the opponent
- **Then** the move history stays and (Banqi) face-up pieces stay face-up.
- **Source**: `src/ui/components/BanqiBoard.tsx:180-186`.
- **Tests**: `tests/ui/ai-level-preserves-game.test.ts:62`.

### 5.3 Requirement: All three games use difficulty wording; the parenthetical must be truthful

All three label the choice as **difficulty** ("電腦難度：", "Level 1", "Level 2"). The parenthetical description must describe how that game's AI actually plays: Xiangqi and Gomoku say "Minimax" for Level 2 because it is a search; Banqi overrides the default to say "穩健" (Cautious) because its Level 2 is a greedy heuristic over revealed pieces, not a search, so advertising "Minimax" there would be a false claim.

Banqi was briefly labelled "對手風格" (style) and claimed to be two evenly-matched opponents. That rested on a 14:14 measurement that attributed wins by the opening `currentPlayer`, which before the first flip is only the first mover's placeholder; the half of games whose first flip is black were scored for the wrong side, flattening a real gap into a tie (§7.1).

- **Source**: `src/ui/components/AiLevelSelector.tsx` (`DEFAULT_AI_LEVEL_LABELS`), `src/ui/components/BanqiBoard.tsx` (`BANQI_AI_LABELS`).
- **Tests**: `tests/ui/ai-selector-labels.test.ts:20,28`, `tests/banqi/ai-level2.test.ts:12-19`.

---

## 6. The AIs

All six are produced by factory functions that take optional `AiOptions` (see §8): `createXiangqiAiLevel1/2`, `createGomokuAiLevel1/2`, `createBanqiAiLevel1/2`. Ids and display names are stable contracts.

- **Source**: `src/games/xiangqi/ai.ts:138-139,164-165,241-247`, `src/games/gomoku/ai.ts:109-110,324-325,396-402`, `src/games/banqi/ai.ts:100-101,205-206,258-264`.
- **Tests**: `tests/xiangqi/ai-level2.test.ts:11`, `tests/banqi/ai-level2.test.ts:12`, `tests/xiangqi/ai.test.ts:11`, `tests/gomoku/ai.test.ts:11`.

| Game | id (L1 / L2) | Level 1 | Level 2 |
|------|--------------|---------|---------|
| Xiangqi | `xiangqi-ai-l1` / `xiangqi-ai-l2` | one-ply heuristic | depth-2 minimax with alpha-beta |
| Gomoku | `gomoku-ai-l1` / `gomoku-ai-l2` | one-ply pattern heuristic | depth-2 minimax with alpha-beta, neighbour pruning, pattern evaluation |
| Banqi | `banqi-ai-l1` / `banqi-ai-l2` | "Aggressive": single-sample guess + greedy | "Cautious": view-only safety heuristic |

### 6.1 Requirement: Xiangqi AIs

- **Level 1** scores each legal move once after applying it (capture value, giving check, resulting material, small soldier-advance bonus) and picks among the best (§8). No lookahead.
- **Level 2** searches depth 2 (its move and the opponent's reply) with alpha-beta, moves ordered captures first then checks, terminal wins/losses scored as decisive.

- **Source**: `src/games/xiangqi/ai.ts:65-89,137-159` (L1), `:163-239` (L2; depth at 167, ordering at 100-118, decisive handling at 197).
- **Tests**: `tests/xiangqi/ai.test.ts:32,64`, `tests/xiangqi/ai-level2.test.ts:32,56,78` (takes a mate in one, resolves a check, performance budget).

#### Scenario: Level 2 takes an immediate checkmate
- **Given** a position where one move gives checkmate
- **When** Level 2 selects a move
- **Then** it plays that move.
- **Source**: `src/games/xiangqi/ai.ts:195-197`.
- **Tests**: `tests/xiangqi/ai-level2.test.ts:32`.

### 6.2 Requirement: Gomoku AIs

- **Level 1** scores each legal intersection by whether it wins, blocks a win, creates/blocks open lines, with a small centre preference, and picks among the best (§8). No lookahead.
- **Level 2** considers only empty points near existing stones (opening on `(7, 7)` for an empty board), keeps the best-scored 12 candidates at the root and 8 inside the search, searches depth 2 with alpha-beta, and evaluates leaves by line patterns for both sides.

- **Source**: `src/games/gomoku/ai.ts:41-88,107-125` (L1), `:127-153,155-200,297-394` (L2; depth at 327, limits at 302-303, opening at 132-135).
- **Tests**: `tests/gomoku/ai.test.ts:16,24,49`, `tests/gomoku/ai-level2.test.ts:7,16,38,60`.

#### Scenario: Immediate win and forced block
- **Given** four stones in a row for the AI (or the opponent) with an open fifth point
- **Then** both levels take the win, or block the opponent's win.
- **Source**: `src/games/gomoku/ai.ts:49-50` (L1), `:388-389` (L2 leaf).
- **Tests**: `tests/gomoku/ai.test.ts:24,49`, `tests/gomoku/ai-level2.test.ts:16,38`.

### 6.3 Requirement: Banqi is a difficulty ladder (Level 2 beats Level 1)

- **Level 1 "進取 (Aggressive)"** guesses the face-down cells once (§3.4), scores each flip with a constant and each move by captured value plus resulting material, and picks among the best (§8). It captures whenever it gains material, without checking whether the piece can be captured back.
- **Level 2 "穩健 (Cautious)"** reads only revealed pieces. It values a capture, subtracts a penalty if the moved piece could be captured on arrival by an adjacent enemy, rewards moving an already-threatened piece away, and scores a flip lower the stronger the adjacent enemy pieces are.
- Level 2 clearly beats Level 1, enforced by a paired-games test with correct win attribution (§7.1). The fix that corrected the cannon threat model (§9, previously L4) widened the margin; the earlier "evenly matched" reading was a measurement error, not a property of the AIs.

- **Source**: `src/games/banqi/ai.ts:99-127` (L1), `:129-256` (L2; flip at 227-231, move at 233-254).
- **Tests**: `tests/banqi/ai-level2.test.ts:38,76` (takes an exposed capture; avoids stepping into capture), `tests/banqi/ai-blind.test.ts:47,67`.

#### Scenario: Cautious AI avoids stepping into capture
- **Given** a red general that may step next to a black soldier (which captures a general)
- **When** the Cautious AI chooses
- **Then** it does not make that step.
- **Source**: `src/games/banqi/ai.ts:241-248`, `src/games/banqi/rules.ts:38`.
- **Tests**: `tests/banqi/ai-level2.test.ts:76`.

---

## 7. Difficulty Monotonicity: What Is and Is Not Guarded

### 7.1 Requirement: Gomoku Level 2 must beat Level 1 (test-enforced)

The test `tests/gomoku/ai-difficulty-ladder.test.ts` plays 10 paired games between Gomoku Level 2 and Level 1 (alternating colours, fixed-seed random two-move openings, at most 300 plies) and asserts that Level 2 wins **strictly more** games than Level 1, and that Level 2's average thinking time per move is under 100 ms. Banqi has an equivalent test (§7.2).

- **Source (guard)**: `tests/gomoku/ai-difficulty-ladder.test.ts:30-31,33-86` (assertions at 81 and 85).

#### Scenario: A regression of Level 2
- **Given** an evaluation change that makes Gomoku Level 2 no stronger than Level 1
- **Then** the ladder test fails.
- **Source**: `tests/gomoku/ai-difficulty-ladder.test.ts:81`.

### 7.2 Requirement: Banqi Level 2 must beat Level 1 (test-enforced)

`tests/banqi/ai-strength-ladder.test.ts` plays paired games between Banqi Level 2 (Cautious) and Level 1 (Aggressive), **attributing each win through `moverOf`** rather than the opening placeholder, and asserts Level 2 wins more than three times as many as Level 1. Attributing by the placeholder instead gives roughly 20:19 on the same games; by `moverOf` it is 35:4, and 41:1 after the cannon-threat fix.

Xiangqi still has **no** strength test. Its selector calls its AIs a ladder but nothing enforces it; its tests cover legality, a few tactics and a performance budget.

- **Source**: `tests/banqi/ai-strength-ladder.test.ts` (attribution via `engine.moverOf`, assertion `cautious > aggressive * 3`).

---

## 8. Randomness: ε-ties and an Injectable Source

### 8.1 Requirement: Ties within ε are broken at random

All six AIs score candidate moves and then call `pickWithinEpsilon(scored, epsilon, rng, decisiveScore?)`: the candidates are every move scoring at least `best − ε`; one is picked uniformly with the RNG. The first element of the candidate list is always the first best-scoring move in original order, so an RNG that always returns `0` reproduces the old "first best" behaviour. If `|best|` reaches `decisiveScore` (a forced win or loss was seen) the first best move is returned with no randomness.

- **Source**: `src/core/ai/random.ts:40-72`.
- **Tests**: `tests/ai/random.test.ts:40,47,54,59,63,80`, `tests/ai/move-variety.test.ts:23,40,58,89,106,118`.

#### Scenario: Always-zero RNG
- **Given** `rng = () => 0`
- **Then** the AI returns the first best-scoring move.
- **Source**: `src/core/ai/random.ts:62-71`.
- **Tests**: `tests/ai/random.test.ts:54`.

#### Scenario: Forced win in Xiangqi / Gomoku Level 2
- **Given** a position with a forced win visible to Level 2
- **Then** every seed gives the same move.
- **Source**: `src/games/xiangqi/ai.ts:133,197`, `src/games/gomoku/ai.ts:165,346`.
- **Tests**: `tests/ai/move-variety.test.ts:40,106`.

### 8.2 Requirement: ε values

Xiangqi 10 (both levels); Gomoku Level 1 0.5, Level 2 1; Banqi Level 1 4, Level 2 25. Each is documented as smaller than the smallest meaningful score gap of that evaluator.

- **Source**: `src/games/xiangqi/ai.ts:130`, `src/games/gomoku/ai.ts:95,105`, `src/games/banqi/ai.ts:33-34`.

### 8.3 Requirement: Random source is injectable

Every AI factory accepts `AiOptions { rng?, seed? }`. Resolution order: `rng` if given, else a seeded `mulberry32(seed)` if `seed` is given, else `Math.random`. A seeded AI is reproducible: same seed and same input give the same move.

- **Source**: `src/core/ai/random.ts:1-27`.
- **Tests**: `tests/ai/random.test.ts:10,25`, `tests/ai/move-variety.test.ts:33,99`.

#### Scenario: Same seed, same move
- **Given** two AIs created with the same `seed` and the same position
- **Then** they return the same move.
- **Source**: `src/core/ai/random.ts:12-27`.
- **Tests**: `tests/ai/move-variety.test.ts:33`.

---

## 9. Known Limitations (written as limitations, not features)

- **L1 — Banqi AIs never use the decisive-score shortcut.** `BANQI_DECISIVE_SCORE` is declared but never passed to `pickWithinEpsilon`, so near-equal winning/losing Banqi moves are still chosen at random. (`src/games/banqi/ai.ts:37,125,224`.)
- **L2 — `BANQI_L2_SAMPLES` is exported but unused.** Level 2 no longer samples; the constant is a leftover from an earlier design. (`src/games/banqi/ai.ts:40`; no other reference in `src/` or `tests/`.)
- **L3 — Determinization over-counts captured pieces.** The view has no capture record, so captured pieces stay in the "unseen" pool and Level 1 may guess a face-down cell to be a piece that is already gone. (`src/games/banqi/determinize.ts:44-52`.)
- **L4 — The Cautious AI treats an adjacent enemy cannon as able to capture it.** `attackedAt` reuses `canCapture`, which would let a cannon capture orthogonally, although a cannon captures only by jumping; the comment says cannon jumps are excluded but adjacent cannons are not. (`src/games/banqi/ai.ts:181-191` with `src/games/banqi/rules.ts:31-46`, `:77-117`.)
- **L5 — Xiangqi's difficulty ladder is not test-enforced** (§7.2); Gomoku's and Banqi's are. Win-rate figures quoted in comments (`src/ui/components/AiLevelSelector.tsx:10-12`, `src/ui/components/BanqiBoard.tsx:43-47`, `tests/ui/ai-selector-labels.test.ts:9-12`, `tests/banqi/ai-level2.test.ts:12-15`) are historical measurements that no test reproduces.
- **L6 — Search depth is fixed at 2 plies** for both minimax AIs, with no time budget or iterative deepening. (`src/games/xiangqi/ai.ts:167`, `src/games/gomoku/ai.ts:327`.)
- **L7 — Banqi's initial deal is not seedable through the engine**, so reproducing a whole PvE Banqi game requires overriding `Math.random` globally while the engine is constructed. (`src/games/banqi/board.ts:63-70`; the test does exactly that: `tests/ui/ai-observation-boundary.test.ts:39-48`.)
- **L8 — A stale test-file reference exists in a code comment**: `src/games/gomoku/ai.ts:103` cites `tests/gomoku/ai-randomness.test.ts`, which does not exist (variety is covered by `tests/ai/move-variety.test.ts`).
