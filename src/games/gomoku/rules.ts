import { BOARD_SIZE, cloneBoard, inBounds } from "./board";
import type {
  GomokuMove,
  GomokuPlayer,
  GomokuRuleMode,
  GomokuState,
} from "./types";
import type { Position } from "../../core/game/types";

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

/** 回傳所有達成 ≥5 的連線座標（取第一條完整五連） */
export function findWinningLine(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  player: GomokuPlayer
): Position[] | null {
  if (board[row][col] !== player) {
    return null;
  }

  for (const [dr, dc] of DIRECTIONS) {
    const line: Position[] = [{ row, col }];

    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === player) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    r = row - dr;
    c = col - dc;
    while (inBounds(r, c) && board[r][c] === player) {
      line.unshift({ row: r, col: c });
      r -= dr;
      c -= dc;
    }

    if (line.length >= 5) {
      // 取連續的 5 顆（從中間往外取最靠近落子點的五連）
      const idx = line.findIndex((p) => p.row === row && p.col === col);
      const start = Math.max(0, Math.min(idx - 2, line.length - 5));
      return line.slice(start, start + 5);
    }
  }
  return null;
}

export function checkWin(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  player: GomokuPlayer
): boolean {
  return findWinningLine(board, row, col, player) !== null;
}

/** 計算某方向連續同色數量（不含本身） */
function countInDirection(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: GomokuPlayer
): number {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (inBounds(r, c) && board[r][c] === player) {
    count++;
    r += dr;
    c += dc;
  }
  return count;
}

/** 判斷是否為活三 / 衝四等（用於禁手） */
function isOpenThree(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: GomokuPlayer
): boolean {
  // 簡化但實用的活三判斷：兩端皆空 + 總共 3 子
  const forward = countInDirection(board, row, col, dr, dc, player);
  const backward = countInDirection(board, row, col, -dr, -dc, player);
  const total = forward + backward + 1;
  if (total !== 3) return false;

  const fr = row + (forward + 1) * dr;
  const fc = col + (forward + 1) * dc;
  const br = row - (backward + 1) * dr;
  const bc = col - (backward + 1) * dc;

  const frontOpen = inBounds(fr, fc) && board[fr][fc] === null;
  const backOpen = inBounds(br, bc) && board[br][bc] === null;
  return frontOpen && backOpen;
}

function isFour(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: GomokuPlayer
): boolean {
  const forward = countInDirection(board, row, col, dr, dc, player);
  const backward = countInDirection(board, row, col, -dr, -dc, player);
  return forward + backward + 1 === 4;
}

/** 黑方禁手檢查（三三、四四、長連） */
export function isForbiddenMove(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  ruleMode: GomokuRuleMode
): boolean {
  if (ruleMode !== "forbidden_moves") return false;

  // 暫時落子
  const temp = cloneBoard(board);
  temp[row][col] = "black";

  // 1. 長連（≥6）是禁手（必須先於五連判定）
  for (const [dr, dc] of DIRECTIONS) {
    const total =
      countInDirection(temp, row, col, dr, dc, "black") +
      countInDirection(temp, row, col, -dr, -dc, "black") +
      1;
    if (total >= 6) return true;
  }

  // 2. 五連優先：成五就不是禁手（若剛好成五，則三三/四四不予判罰，直接算勝）
  if (checkWin(temp, row, col, "black")) return false;

  // 3. 雙活三
  let openThreeCount = 0;
  for (const [dr, dc] of DIRECTIONS) {
    if (isOpenThree(temp, row, col, dr, dc, "black")) {
      openThreeCount++;
    }
  }
  if (openThreeCount >= 2) return true;

  // 4. 雙四
  let fourCount = 0;
  for (const [dr, dc] of DIRECTIONS) {
    if (isFour(temp, row, col, dr, dc, "black")) {
      fourCount++;
    }
  }
  if (fourCount >= 2) return true;

  return false;
}

export function getLegalMoves(state: GomokuState): GomokuMove[] {
  if (state.winner !== null || state.isDraw === true) return [];

  const moves: GomokuMove[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (state.board[r][c] !== null) continue;

      // 禁手規則下，黑方不能下禁手點
      if (
        state.currentPlayer === "black" &&
        isForbiddenMove(state.board, r, c, state.ruleMode)
      ) {
        continue;
      }
      moves.push({ row: r, col: c });
    }
  }
  return moves;
}

export function applyMoveUnchecked(
  state: GomokuState,
  move: GomokuMove
): GomokuState {
  const board = cloneBoard(state.board);
  const player = state.currentPlayer;
  board[move.row][move.col] = player;

  const winningLine = findWinningLine(board, move.row, move.col, player);
  const hasWon = winningLine !== null;
  const winner = hasWon ? player : null;

  let hasEmpty = false;
  if (!hasWon) {
    outer: for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) {
          hasEmpty = true;
          break outer;
        }
      }
    }
  }

  return {
    board,
    currentPlayer: player === "black" ? "white" : "black",
    winner,
    isDraw: !hasWon && !hasEmpty,
    moveNumber: state.moveNumber + 1,
    ruleMode: state.ruleMode,
    winningLine: winningLine ?? undefined,
  };
}

export function applyMove(state: GomokuState, move: GomokuMove): GomokuState {
  if (state.winner !== null || state.isDraw === true) {
    throw new Error("Illegal move: game already finished");
  }
  if (!inBounds(move.row, move.col)) {
    throw new Error("Illegal move: out of bounds");
  }
  if (state.board[move.row][move.col] !== null) {
    throw new Error("Illegal move: intersection already occupied");
  }
  if (
    state.currentPlayer === "black" &&
    isForbiddenMove(state.board, move.row, move.col, state.ruleMode)
  ) {
    throw new Error("Illegal move: forbidden move for black");
  }
  return applyMoveUnchecked(state, move);
}

export function isGameOver(state: GomokuState): boolean {
  return state.winner !== null || state.isDraw === true || getLegalMoves(state).length === 0;
}

export function getWinner(state: GomokuState): GomokuPlayer | null {
  return state.winner;
}
