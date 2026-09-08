import { cloneBoard, inBounds, ROWS, COLS } from "./board";
import type {
  BanqiFullState,
  BanqiMove,
  BanqiPiece,
  BanqiPlayer,
  BanqiState,
  BanqiViewPiece,
  BanqiViewState,
} from "./types";
import type { GameViewContext, Position } from "../../core/game/types";

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

export function canCapture(attacker: BanqiPiece, defender: BanqiPiece): boolean {
  // Face-down pieces cannot be captured
  if (!defender.isRevealed) return false;

  // Same side cannot capture
  if (attacker.player === defender.player) return false;

  // Special rule: Soldier (1) eats General (7)
  if (attacker.rank === 1 && defender.rank === 7) return true;

  // Special rule: General (7) CANNOT eat Soldier (1)
  if (attacker.rank === 7 && defender.rank === 1) return false;

  // Standard hierarchy: higher or equal rank eats lower
  return attacker.rank >= defender.rank;
}

export function getLegalMoves(state: BanqiState): BanqiMove[] {
  if (state.winner !== null || state.isDraw === true) return [];

  const moves: BanqiMove[] = [];
  const current = state.currentPlayer;

  // 1. Any face-down piece can be flipped by the active player
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = state.board[r][c];
      if (piece && !piece.isRevealed) {
        moves.push({ type: "flip", pos: { row: r, col: c } });
      }
    }
  }

  // 2. If colors have not been assigned yet (prior to first flip), no normal movement is possible
  if (state.player1Color === null) {
    return moves;
  }

  // 3. For face-up pieces of the current player: calculate moves & captures
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = state.board[r][c];
      if (!piece || !piece.isRevealed || piece.player !== current) continue;

      const from: Position = { row: r, col: c };

      if (piece.type === "cannon") {
        // Cannon: 1 step orthogonal move into EMPTY space
        for (const [dr, dc] of DIRS) {
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(nr, nc) && state.board[nr][nc] === null) {
            moves.push({ type: "move", from, to: { row: nr, col: nc } });
          }
        }

        // Cannon: jump capture along 4 straight lines
        for (const [dr, dc] of DIRS) {
          let step = 1;
          let screenFound = false;

          while (true) {
            const tr = r + dr * step;
            const tc = c + dc * step;
            if (!inBounds(tr, tc)) break;

            const target = state.board[tr][tc];

            if (!screenFound) {
              if (target !== null) {
                screenFound = true; // Found screen (can be face-up or face-down, friend or foe)
              }
            } else {
              // Looking for target behind screen
              if (target !== null) {
                // Found first piece behind screen
                if (target.isRevealed && target.player !== piece.player) {
                  // Valid cannon jump capture!
                  moves.push({ type: "move", from, to: { row: tr, col: tc } });
                }
                break; // Cannon can only jump over exactly 1 piece
              }
            }

            step++;
          }
        }
      } else {
        // Non-cannon pieces: 1 step orthogonal move or capture
        for (const [dr, dc] of DIRS) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;

          const dest = state.board[nr][nc];
          if (dest === null) {
            // Move into empty space
            moves.push({ type: "move", from, to: { row: nr, col: nc } });
          } else if (canCapture(piece, dest)) {
            // Adjacent orthogonal capture
            moves.push({ type: "move", from, to: { row: nr, col: nc } });
          }
        }
      }
    }
  }

  return moves;
}

export function isGameOver(state: BanqiState): boolean {
  if (state.winner !== null || state.isDraw === true) return true;

  // Check if any pieces of red or black still exist on board
  let redCount = 0;
  let blackCount = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = state.board[r][c];
      if (piece) {
        if (piece.player === "red") redCount++;
        else blackCount++;
      }
    }
  }

  if (state.player1Color !== null) {
    if (redCount === 0 || blackCount === 0) return true;
  }

  return getLegalMoves(state).length === 0;
}

export function getWinner(state: BanqiState): BanqiPlayer | null {
  if (state.winner !== null) return state.winner;

  let redCount = 0;
  let blackCount = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = state.board[r][c];
      if (piece) {
        if (piece.player === "red") redCount++;
        else blackCount++;
      }
    }
  }

  if (state.player1Color !== null) {
    if (redCount === 0 && blackCount > 0) return "black";
    if (blackCount === 0 && redCount > 0) return "red";
  }

  // Stalemate check
  if (getLegalMoves(state).length === 0 && state.player1Color !== null) {
    // Current player cannot move -> loses
    return state.currentPlayer === "red" ? "black" : "red";
  }

  return null;
}

export function applyMoveUnchecked(state: BanqiState, move: BanqiMove): BanqiState {
  const board = cloneBoard(state.board);
  let player1Color = state.player1Color;

  if (move.type === "flip") {
    const piece = board[move.pos.row][move.pos.col];
    if (!piece || piece.isRevealed) {
      throw new Error("Cannot flip cell");
    }

    board[move.pos.row][move.pos.col] = {
      ...piece,
      isRevealed: true,
    };

    // First flip decides Player 1's color
    if (player1Color === null) {
      player1Color = piece.player;
    }
  } else {
    const piece = board[move.from.row][move.from.col];
    if (!piece) {
      throw new Error("No piece at source");
    }

    board[move.from.row][move.from.col] = null;
    board[move.to.row][move.to.col] = piece;
  }

  let nextPlayer: BanqiPlayer;
  if (state.player1Color === null && player1Color !== null) {
    // First flip established Player 1 as player1Color; turn now goes to opponent
    nextPlayer = player1Color === "red" ? "black" : "red";
  } else {
    nextPlayer = state.currentPlayer === "red" ? "black" : "red";
  }

  const nextState: BanqiState = {
    board,
    currentPlayer: nextPlayer,
    player1Color,
    winner: null,
    moveNumber: state.moveNumber + 1,
  };

  const winner = getWinner(nextState);

  return {
    ...nextState,
    winner,
  };
}

/**
 * Backward-compatible masking helper for tests
 */
export function maskHiddenState(state: BanqiState): BanqiState {
  const maskedBoard = state.board.map((row) =>
    row.map((piece) => {
      if (!piece) return null;
      if (piece.isRevealed) {
        return { ...piece };
      }
      return {
        id: "hidden",
        player: "unknown" as unknown as BanqiPlayer,
        type: "unknown" as unknown as BanqiPiece["type"],
        rank: 0,
        isRevealed: false,
      };
    })
  );

  return {
    ...state,
    board: maskedBoard,
  };
}

/**
 * Generic Player/Spectator View Projection Contract
 */
export function projectBanqiView(
  state: BanqiFullState,
  _context: GameViewContext
): BanqiViewState {
  const viewBoard: (BanqiViewPiece | null)[][] = state.board.map((row, r) =>
    row.map((piece, c) => {
      if (!piece) return null;
      if (piece.isRevealed) {
        return {
          id: piece.id,
          player: piece.player,
          type: piece.type,
          rank: piece.rank,
          isRevealed: true,
        };
      }
      // Omit player, type, and rank completely for hidden pieces
      return {
        id: `hidden-${r}-${c}`,
        isRevealed: false,
      };
    })
  );

  return {
    board: viewBoard,
    currentPlayer: state.currentPlayer,
    player1Color: state.player1Color,
    winner: state.winner,
    isDraw: state.isDraw,
    moveNumber: state.moveNumber,
  };
}
