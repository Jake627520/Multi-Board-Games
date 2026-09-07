import { cloneBoard, crossedRiver, inBounds, isPalace } from "./board";
import type { Piece, XiangqiMove, XiangqiState } from "./types";
import type { Player, Position } from "../../core/game/types";

const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const;

function same(a: Position, b: Position) {
  return a.row === b.row && a.col === b.col;
}

function countBetween(state: XiangqiState, a: Position, b: Position) {
  let count = 0;
  const dr = Math.sign(b.row - a.row);
  const dc = Math.sign(b.col - a.col);
  let r = a.row + dr;
  let c = a.col + dc;
  while (!same({row:r,col:c}, b)) {
    if (state.board[r][c]) count++;
    r += dr;
    c += dc;
  }
  return count;
}

function pseudoMoves(state: XiangqiState, piece: Piece): Position[] {
  const { row, col } = piece.position;
  const out: Position[] = [];

  const add = (r: number, c: number) => {
    if (inBounds(r, c) && state.board[r][c]?.player !== piece.player) out.push({ row: r, col: c });
  };

  switch (piece.type) {
    case "general":
      for (const [dr, dc] of dirs) {
        const r = row + dr, c = col + dc;
        if (isPalace(piece.player, r, c)) add(r, c);
      }
      // Flying general is handled by check detection / legal move filtering.
      break;

    case "advisor":
      for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const r = row + dr, c = col + dc;
        if (isPalace(piece.player, r, c)) add(r, c);
      }
      break;

    case "elephant":
      for (const [dr, dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
        const r = row + dr, c = col + dc;
        const eye = { row: row + dr / 2, col: col + dc / 2 };
        const ownSide = piece.player === "red" ? r >= 5 : r <= 4;
        if (inBounds(r,c) && ownSide && !state.board[eye.row][eye.col]) add(r,c);
      }
      break;

    case "horse":
      for (const [dr, dc, lr, lc] of [
        [2,1,1,0],[2,-1,1,0],[-2,1,-1,0],[-2,-1,-1,0],
        [1,2,0,1],[1,-2,0,-1],[-1,2,0,1],[-1,-2,0,-1],
      ]) {
        const leg = { row: row + lr, col: col + lc };
        const r = row + dr, c = col + dc;
        if (inBounds(r,c) && !state.board[leg.row][leg.col]) add(r,c);
      }
      break;

    case "chariot":
      for (const [dr, dc] of dirs) {
        let r = row + dr, c = col + dc;
        while (inBounds(r,c)) {
          if (!state.board[r][c]) out.push({row:r,col:c});
          else {
            if (state.board[r][c]!.player !== piece.player) out.push({row:r,col:c});
            break;
          }
          r += dr; c += dc;
        }
      }
      break;

    case "cannon":
      for (const [dr, dc] of dirs) {
        let r = row + dr, c = col + dc;
        while (inBounds(r,c) && !state.board[r][c]) {
          out.push({row:r,col:c}); r += dr; c += dc;
        }
        if (!inBounds(r,c)) continue;
        r += dr; c += dc;
        while (inBounds(r,c)) {
          if (state.board[r][c]) {
            if (state.board[r][c]!.player !== piece.player) out.push({row:r,col:c});
            break;
          }
          r += dr; c += dc;
        }
      }
      break;

    case "soldier": {
      const forward = piece.player === "red" ? -1 : 1;
      add(row + forward, col);
      if (crossedRiver(piece.player, row)) {
        add(row, col - 1);
        add(row, col + 1);
      }
      break;
    }
  }

  return out;
}

function generalPositions(state: XiangqiState) {
  const result: Partial<Record<Player, Position>> = {};
  for (const row of state.board) for (const piece of row) {
    if (piece?.type === "general") result[piece.player] = piece.position;
  }
  return result;
}

export function isInCheck(state: XiangqiState, player: Player): boolean {
  const generals = generalPositions(state);
  const king = generals[player];
  if (!king) return true;

  const enemy = player === "red" ? "black" : "red";

  // Flying general: same file, no pieces between.
  const enemyGeneral = generals[enemy];
  if (enemyGeneral && enemyGeneral.col === king.col &&
      countBetween(state, king, enemyGeneral) === 0) return true;

  for (const row of state.board) for (const piece of row) {
    if (!piece || piece.player !== enemy) continue;
    if (pseudoMoves(state, piece).some((p) => same(p, king))) return true;
  }
  return false;
}

export function getLegalMoves(state: XiangqiState, player = state.currentPlayer): XiangqiMove[] {
  const moves: XiangqiMove[] = [];

  for (const row of state.board) for (const piece of row) {
    if (!piece || piece.player !== player) continue;
    for (const to of pseudoMoves(state, piece)) {
      const move = { from: piece.position, to };
      const next = applyMoveUnchecked(state, move);
      if (!isInCheck(next, player)) moves.push(move);
    }
  }

  return moves;
}

export function applyMoveUnchecked(state: XiangqiState, move: XiangqiMove): XiangqiState {
  const board = cloneBoard(state.board);
  const piece = board[move.from.row][move.from.col];
  if (!piece) throw new Error("No piece at source");

  const moved = { ...piece, position: { ...move.to } };
  board[move.from.row][move.from.col] = null;
  board[move.to.row][move.to.col] = moved;

  let winner: Player | null = null;
  if (moved.type === "general") {
    const captured = state.board[move.to.row][move.to.col];
    if (captured?.type === "general") winner = moved.player;
  }

  return {
    board,
    currentPlayer: state.currentPlayer === "red" ? "black" : "red",
    winner,
    moveNumber: state.moveNumber + 1,
  };
}

export function applyMove(state: XiangqiState, move: XiangqiMove): XiangqiState {
  const legal = getLegalMoves(state);
  if (!legal.some((m) => same(m.from, move.from) && same(m.to, move.to))) {
    throw new Error("Illegal move");
  }
  return applyMoveUnchecked(state, move);
}

export function isGameOver(state: XiangqiState) {
  return state.winner !== null || getLegalMoves(state).length === 0;
}

export function getWinner(state: XiangqiState): Player | null {
  if (state.winner) return state.winner;
  if (getLegalMoves(state).length === 0) {
    return state.currentPlayer === "red" ? "black" : "red";
  }
  return null;
}