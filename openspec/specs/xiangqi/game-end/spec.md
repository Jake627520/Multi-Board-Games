# Xiangqi Game End & Victory Conditions Specification

## 1. Scope & Purpose

This specification governs end-of-game determinations in Xiangqi, specifically:
- Checkmate (將死)
- Stalemate / No Legal Moves (困斃)
- Resignation / General Capture
- Winner determination

---

## 2. Checkmate (將死)

A player is **Checkmated** when:
1. Their General is in check (`isInCheck(state, player) === true`), AND
2. The player has zero legal moves to escape check (`getLegalMoves(state, player).length === 0`).

### Official Rule
The checkmated player loses immediately. The opponent is declared the winner.

#### Scenario: Checkmate results in loss for checked player
- **Given** an active Xiangqi match with `currentPlayer` set to `"black"`
- **And** the Black General is in check from Red
- **And** Black has no legal moves available (`getLegalMoves(state).length === 0`)
- **When** `isGameOver(state)` and `getWinner(state)` are evaluated
- **Then** `isGameOver(state)` evaluates to `true`
- **And** `getWinner(state)` returns `"red"`.

---

## 3. Stalemate / 困斃 (No Legal Moves)

A player is **Stalemated (困斃)** when:
1. Their General is NOT in check (`isInCheck(state, player) === false`), AND
2. The player has zero legal moves (`getLegalMoves(state, player).length === 0`) — every remaining piece is either immobilized or every candidate move would create illegal self-check.

### Official Xiangqi Rule vs Western Chess
> [!IMPORTANT]
> Unlike Western Chess (where stalemate is a Draw), in **official Xiangqi rules (World Xiangqi Federation / Asian Xiangqi Federation)**, a player who has no legal moves when it is their turn to move is declared the **LOSER**.
> The player who successfully immobilizes the opponent (causing 困斃) is declared the **WINNER**.

#### Scenario: Stalemate results in loss for immobilized player
- **Given** an active Xiangqi match with `currentPlayer` set to `"red"`
- **And** the Red General is NOT currently in check (`isInCheck(state, "red") === false`)
- **And** Red has zero legal moves (`getLegalMoves(state).length === 0`)
- **When** `isGameOver(state)` and `getWinner(state)` are evaluated
- **Then** `isGameOver(state)` evaluates to `true`
- **And** `getWinner(state)` returns `"black"` (the opponent).

---

## 4. General Capture (Direct Capture)

If an engine state directly results in the capture of a General (e.g. unchecked fast engine state), the capturing player wins immediately.

#### Scenario: Capturing enemy General
- **Given** a board state where the opponent General was captured
- **When** `isGameOver(state)` and `getWinner(state)` are evaluated
- **Then** `isGameOver(state)` evaluates to `true`
- **And** `getWinner(state)` returns the capturing player.

---

## 5. Cyclical Adjudication & Natural Draws

### 5.1 Perpetual Check (長將判負)
If a player repeatedly delivers checks causing an identical board position to recur within a cyclical move pattern, that player is guilty of single-sided perpetual check and is declared the **LOSER**.
- `isGameOver(state) === true`
- `getWinner(state) === opponent`

### 5.2 Threefold Repetition (三次重複局面和棋)
If an identical board state with the same player turn occurs 3 times during a match without one-sided illegal continuous attack (perpetual check/chase), the match ends in a **DRAW (和棋)**.
- `isGameOver(state) === true`
- `getWinner(state) === null`
- `state.isDraw === true`

### 5.3 Sixty-Move Non-Capture Rule (自然限招)
If 120 consecutive half-moves (60 full rounds by both players) occur without any piece capture, either side may claim a draw or the match automatically terminates as a **DRAW (和棋)**.
- `isGameOver(state) === true`
- `getWinner(state) === null`
- `state.isDraw === true`

---

## 6. Summary State Matrix

| In Check? | Legal Moves | Repetition / Limits | `isGameOver` | `getWinner` | Condition |
|---|---|---|---|---|---|
| Yes | 0 | - | `true` | Opponent | Checkmate (將死) |
| No | 0 | - | `true` | Opponent | Stalemate (困斃) |
| Any | - | Perpetual Check cycle | `true` | Checked player | Perpetual Check forfeiture (長將判負) |
| Any | - | 3 identical states | `true` | `null` | Threefold Repetition Draw (三次重複和棋) |
| Any | - | 120 half-moves no capture | `true` | `null` | 60-Round Draw (自然限招和棋) |
| Yes | > 0 | Normal play | `false` | `null` | Active check in progress |
| No | > 0 | Normal play | `false` | `null` | Standard match in progress |
