import { cloneBoard, crossedRiver, inBounds, isPalace } from "./board";
import type { Piece, XiangqiMove, XiangqiPlayer, XiangqiState } from "./types";
import type { Player, Position } from "../../core/game/types";
import { hashSignature } from "../shared/hash";

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

/**
 * 只算移動後的盤面，不建立 positionHistory / checkHistory / terminationReason
 * 等衍生欄位。合法性檢查（是否讓自己的將被將軍）只需要盤面本身，若改呼叫
 * 完整的 applyMoveUnchecked，會為了一個馬上就丟棄的中間局面白算一次
 * boardSignature + hashSignature——這條路徑是每次合法走法枚舉都會大量
 * 呼叫的熱點（getLegalMoves 對每個偽合法走法都呼叫一次），值得省。
 */
function applyMoveBoardOnly(state: XiangqiState, move: XiangqiMove): (Piece | null)[][] {
  const board = cloneBoard(state.board);
  const piece = board[move.from.row][move.from.col];
  if (!piece) throw new Error("No piece at source");
  const moved = { ...piece, position: { ...move.to } };
  board[move.from.row][move.from.col] = null;
  board[move.to.row][move.to.col] = moved;
  return board;
}

export function getLegalMoves(state: XiangqiState, player = state.currentPlayer): XiangqiMove[] {
  const moves: XiangqiMove[] = [];

  for (const row of state.board) for (const piece of row) {
    if (!piece || piece.player !== player) continue;
    for (const to of pseudoMoves(state, piece)) {
      const move = { from: piece.position, to };
      const nextBoard = applyMoveBoardOnly(state, move);
      if (!isInCheck({ ...state, board: nextBoard }, player)) moves.push(move);
    }
  }

  return moves;
}

export function boardSignature(state: XiangqiState): string {
  const pieces: string[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = state.board[r][c];
      if (p) {
        pieces.push(`${p.player}-${p.type}@${r},${c}`);
      }
    }
  }
  return `${state.currentPlayer}:${pieces.sort().join(";")}`;
}

export function applyMoveUnchecked(state: XiangqiState, move: XiangqiMove): XiangqiState {
  const board = cloneBoard(state.board);
  const piece = board[move.from.row][move.from.col];
  if (!piece) throw new Error("No piece at source");

  const captured = state.board[move.to.row][move.to.col];
  const moved = { ...piece, position: { ...move.to } };
  board[move.from.row][move.from.col] = null;
  board[move.to.row][move.to.col] = moved;

  let winner: XiangqiPlayer | null = null;
  if (moved.type === "general" && captured?.type === "general") {
    winner = moved.player;
  }

  const nextPlayer: XiangqiPlayer = state.currentPlayer === "red" ? "black" : "red";
  const nonCaptureCount = captured !== null ? 0 : (state.nonCaptureCount ?? 0) + 1;

  const tentativeState: XiangqiState = {
    board,
    currentPlayer: nextPlayer,
    winner,
    moveNumber: state.moveNumber + 1,
    nonCaptureCount,
  };

  const isCheck = isInCheck(tentativeState, nextPlayer);
  const checkHistory = state.checkHistory ? [...state.checkHistory, isCheck] : [isCheck];

  // positionHistory 只存局面簽章的雜湊，不存完整簽章字串本身：
  // 三次重複偵測只需要「是否相等」，雜湊值保留了這個性質，卻把每筆
  // 從幾百字元壓到固定 32 個十六進位字元，是長局存檔體積的主要瘦身來源。
  const initialSig = state.positionHistory ? null : hashSignature(boardSignature(state));
  const positionHistory = state.positionHistory ? [...state.positionHistory] : [initialSig!];

  const currentSig = hashSignature(boardSignature(tentativeState));
  positionHistory.push(currentSig);

  let isDraw = false;
  let terminationReason: XiangqiState["terminationReason"] = undefined;

  if (winner) {
    terminationReason = "checkmate";
  } else if (nonCaptureCount >= 120) {
    isDraw = true;
    terminationReason = "sixty_move_draw";
  } else {
    const occurrences: number[] = [];
    for (let i = 0; i < positionHistory.length; i++) {
      if (positionHistory[i] === currentSig) {
        occurrences.push(i);
      }
    }

    if (occurrences.length >= 2) {
      const prevIndex = occurrences[occurrences.length - 2];
      const cycleLength = positionHistory.length - 1 - prevIndex;

      const moverCheckIndices: number[] = [];
      for (let offset = 0; offset < cycleLength; offset += 2) {
        const idx = checkHistory.length - 1 - offset;
        if (idx >= 0) moverCheckIndices.push(idx);
      }

      const allChecks =
        moverCheckIndices.length >= 2 && moverCheckIndices.every((i) => checkHistory[i] === true);

      if (allChecks) {
        winner = nextPlayer;
        terminationReason = "perpetual_check";
      } else if (occurrences.length >= 3) {
        isDraw = true;
        terminationReason = "threefold_repetition";
      }
    }
  }

  return {
    board,
    currentPlayer: nextPlayer,
    winner,
    moveNumber: state.moveNumber + 1,
    isDraw: isDraw ? true : undefined,
    terminationReason,
    positionHistory,
    checkHistory,
    nonCaptureCount,
  };
}

export function applyMove(state: XiangqiState, move: XiangqiMove): XiangqiState {
  const legal = getLegalMoves(state);
  if (!legal.some((m) => same(m.from, move.from) && same(m.to, move.to))) {
    throw new Error("Illegal move");
  }
  return applyMoveUnchecked(state, move);
}

export function isGameOver(state: XiangqiState): boolean {
  return state.winner !== null || state.isDraw === true || getLegalMoves(state).length === 0;
}

export function getWinner(state: XiangqiState): Player | null {
  if (state.winner) return state.winner;
  if (state.isDraw) return null;
  if (getLegalMoves(state).length === 0) {
    return state.currentPlayer === "red" ? "black" : "red";
  }
  return null;
}