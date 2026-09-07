# Xiangqi Pieces & Initial Setup Specification

## 1. Piece Taxonomy & Quantities

Each match begins with **32 pieces** (16 Red pieces and 16 Black pieces), divided into 7 distinct types per side:

| Piece Type | Red Traditional Name | Black Traditional Name | Qty / Side | Starting Ranks |
|---|---|---|---|---|
| `general` | 帥 (Shuai) | 將 (Jiang) | 1 | row 9 (Red), row 0 (Black) |
| `advisor` | 仕 (Shi) | 士 (Shi) | 2 | row 9 (Red), row 0 (Black) |
| `elephant` | 相 (Xiang) | 象 (Xiang) | 2 | row 9 (Red), row 0 (Black) |
| `horse` | 傌 (Ma) | 馬 (Ma) | 2 | row 9 (Red), row 0 (Black) |
| `chariot` | 俥 (Che) | 車 (Che) | 2 | row 9 (Red), row 0 (Black) |
| `cannon` | 炮 (Pao) | 砲 (Pao) | 2 | row 7 (Red), row 2 (Black) |
| `soldier` | 兵 (Bing) | 卒 (Zu) | 5 | row 6 (Red), row 3 (Black) |

---

## 2. Initial Board Coordinates

### 2.1 Black Setup (Row 0 to Row 3)
- **Row 0**: Chariot (0,0), Horse (0,1), Elephant (0,2), Advisor (0,3), General (0,4), Advisor (0,5), Elephant (0,6), Horse (0,7), Chariot (0,8)
- **Row 2**: Cannon (2,1), Cannon (2,7)
- **Row 3**: Soldier (3,0), Soldier (3,2), Soldier (3,4), Soldier (3,6), Soldier (3,8)

### 2.2 Red Setup (Row 6 to Row 9)
- **Row 6**: Soldier (6,0), Soldier (6,2), Soldier (6,4), Soldier (6,6), Soldier (6,8)
- **Row 7**: Cannon (7,1), Cannon (7,7)
- **Row 9**: Chariot (9,0), Horse (9,1), Elephant (9,2), Advisor (9,3), General (9,4), Advisor (9,5), Elephant (9,6), Horse (9,7), Chariot (9,8)

---

## 3. Behavioral Scenarios

### 3.1 Initial State Generation

#### Scenario: Total piece count and player initialization
- **Given** an engine creating a new Xiangqi game
- **When** `createInitialState()` is invoked
- **Then** the board contains exactly 32 pieces
- **And** 16 pieces belong to `"red"` and 16 pieces belong to `"black"`
- **And** `currentPlayer` is set to `"red"`
- **And** `winner` is `null`
- **And** `moveNumber` is `1`.

#### Scenario: Verify piece layout and coordinates
- **Given** a freshly initialized `XiangqiState`
- **When** piece positions are inspected
- **Then** the Red General is located at `(9, 4)` and the Black General is at `(0, 4)`
- **And** Red Cannons are at `(7, 1)` and `(7, 7)`
- **And** Black Cannons are at `(2, 1)` and `(2, 7)`
- **And** Red Soldiers occupy `(6, 0), (6, 2), (6, 4), (6, 6), (6, 8)`
- **And** Black Soldiers occupy `(3, 0), (3, 2), (3, 4), (3, 6), (3, 8)`
- **And** all other 58 intersections are `null`.
