import type { Piece, PieceType, XiangqiMove, XiangqiPlayer, XiangqiState } from "./types";

const RED_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;
const BLACK_NUMERALS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const PIECE_NAMES: Record<XiangqiPlayer, Record<PieceType, string>> = {
  red: {
    general: "帥",
    advisor: "仕",
    elephant: "相",
    horse: "馬",
    chariot: "車",
    cannon: "炮",
    soldier: "兵",
  },
  black: {
    general: "將",
    advisor: "士",
    elephant: "象",
    horse: "馬",
    chariot: "車",
    cannon: "炮",
    soldier: "卒",
  },
};

const DIAGONAL_PIECES = new Set<PieceType>(["horse", "elephant", "advisor"]);

function fileToNumber(col: number, player: XiangqiPlayer): number {
  return player === "red" ? 9 - col : col + 1;
}

function formatNumeral(num: number, player: XiangqiPlayer): string {
  if (player === "red") {
    return RED_NUMERALS[num - 1] ?? String(num);
  }
  return BLACK_NUMERALS[num - 1] ?? String(num);
}

export function toXiangqiNotation(move: XiangqiMove, stateBefore: XiangqiState): string {
  const piece = stateBefore.board[move.from.row][move.from.col];
  if (!piece) {
    throw new Error(`No piece at move origin (${move.from.row}, ${move.from.col})`);
  }

  const player = piece.player;
  const pieceName = PIECE_NAMES[player][piece.type];

  // 1. Check if same-file disambiguation is needed
  // Look for other pieces of same player and same type on the same column
  const sameColPieces: Piece[] = [];
  for (let r = 0; r < 10; r++) {
    const p = stateBefore.board[r][move.from.col];
    if (p && p.player === player && p.type === piece.type) {
      sameColPieces.push(p);
    }
  }

  let prefix1 = pieceName;
  let prefix2 = formatNumeral(fileToNumber(move.from.col, player), player);

  if (sameColPieces.length === 2) {
    // Determine which piece is "前" and which is "後"
    // Red attacks upwards (decreasing row), so smaller row is front
    // Black attacks downwards (increasing row), so larger row is front
    const isFront =
      player === "red"
        ? move.from.row < (sameColPieces[0].position.row === move.from.row ? sameColPieces[1].position.row : sameColPieces[0].position.row)
        : move.from.row > (sameColPieces[0].position.row === move.from.row ? sameColPieces[1].position.row : sameColPieces[0].position.row);

    prefix1 = isFront ? "前" : "後";
    prefix2 = pieceName;
  }

  // 2. Determine movement direction
  let direction: "進" | "退" | "平";
  if (move.to.row === move.from.row) {
    direction = "平";
  } else if (player === "red") {
    direction = move.to.row < move.from.row ? "進" : "退";
  } else {
    direction = move.to.row > move.from.row ? "進" : "退";
  }

  // 3. Determine destination / step description
  let suffix: string;
  if (direction === "平") {
    // Horizontal movement: destination file
    const targetFile = fileToNumber(move.to.col, player);
    suffix = formatNumeral(targetFile, player);
  } else if (DIAGONAL_PIECES.has(piece.type)) {
    // Diagonal pieces: always destination file
    const targetFile = fileToNumber(move.to.col, player);
    suffix = formatNumeral(targetFile, player);
  } else {
    // Straight pieces: step distance
    const steps = Math.abs(move.to.row - move.from.row);
    suffix = formatNumeral(steps, player);
  }

  return `${prefix1}${prefix2}${direction}${suffix}`;
}
