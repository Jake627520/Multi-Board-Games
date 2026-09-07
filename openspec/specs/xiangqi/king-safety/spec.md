# Xiangqi King Safety Specification

## 1. Scope & Purpose

King Safety defines the core invariants protecting the General (帥 / 將). Any move that leaves or puts the moving player's General in danger is illegal and must never appear in `getLegalMoves()`.

---

## 2. Check (將軍) Definition

A player is in **Check** if their General is attacked by at least one enemy piece. An attack exists if an enemy piece could capture the General on the next step according to its movement rules.

#### Scenario: Chariot checks General along open file
- **Given** Red General at `(9, 4)`
- **And** Black Chariot at `(2, 4)` with no intervening pieces on column 4
- **When** `isInCheck(state, "red")` is evaluated
- **Then** the result is `true`.

#### Scenario: Intervening piece shields General from Chariot
- **Given** Red General at `(9, 4)` and Black Chariot at `(2, 4)`
- **And** a Red Advisor is at `(8, 4)`
- **When** `isInCheck(state, "red")` is evaluated
- **Then** the result is `false`.

#### Scenario: Horse checks General
- **Given** Red General at `(9, 4)`
- **And** Black Horse at `(7, 3)` with unblocked horse leg at `(8, 3)`
- **When** `isInCheck(state, "red")` is evaluated
- **Then** the result is `true`.

---

## 3. Flying General (飛將 / 照面)

In Xiangqi, the two Generals must never face each other along the same vertical column (file) without at least one intervening piece between them. If they face directly, both sides are considered in check, which prevents any move that exposes the two Generals to each other.

#### Scenario: Flying general mutually detects check
- **Given** Red General at `(9, 4)` and Black General at `(0, 4)`
- **And** there are zero pieces on column 4 between rows 1 and 8
- **When** check status is evaluated
- **Then** `isInCheck(state, "red")` evaluates to `true`
- **And** `isInCheck(state, "black")` evaluates to `true`.

#### Scenario: Intervening piece breaks flying general
- **Given** Red General at `(9, 4)` and Black General at `(0, 4)`
- **And** a Soldier occupies `(5, 4)`
- **When** check status is evaluated
- **Then** flying general condition does NOT trigger.

---

## 4. Self-Check Prohibition (自殺步過濾)

The central invariant of Xiangqi legal move generation: **A player may never make a move that leaves their own General in check.**

### 4.1 Moving into Direct Check

#### Scenario: General cannot step into attacked square
- **Given** Red General at `(9, 4)`
- **And** a Black Chariot controls column 3
- **When** legal moves for the Red General are generated
- **Then** stepping left to `(9, 3)` is NOT in legal moves.

### 4.2 Exposing General to Flying General

#### Scenario: Shield piece cannot step off the file exposing Generals
- **Given** Red General at `(9, 4)` and Black General at `(0, 4)`
- **And** a Red Chariot is at `(5, 4)`, acting as the sole shield between the two Generals
- **When** legal moves for the Red Chariot are generated
- **Then** moving horizontally to `(5, 3)` or `(5, 5)` exposes the Generals and is strictly ILLEGAL
- **And** moving vertically along column 4 (e.g. `(6, 4)` or `(4, 4)`) preserves the shield and is LEGAL.

### 4.3 Pinned Pieces (牽制子)

#### Scenario: Pinned piece cannot abandon line of check
- **Given** Red General at `(9, 4)`
- **And** Red Cannon at `(7, 4)`
- **And** Black Chariot at `(2, 4)`
- **When** legal moves for the Red Cannon are generated
- **Then** the Cannon cannot move off column 4 because doing so would expose the General to direct check.

---

## 5. Escaping Check (應將 / 解將)

When a player is in check, their legal moves are strictly limited to actions that resolve the check:
1. **Move General**: Move the General to an unattacked square in the Palace.
2. **Block (墊子)**: Move a piece between the attacker and the General (for Chariot, Cannon, or Horse).
3. **Capture (吃子)**: Capture the checking piece.

#### Scenario: Must escape check
- **Given** a player is in check
- **When** `getLegalMoves(state)` is evaluated
- **Then** every move in the returned list results in a state $S'$ where `isInCheck(S', player) === false`.
- **And** if no such move exists, the legal moves list is empty (`[]`).
