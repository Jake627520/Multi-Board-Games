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
import { hashSignature } from "../shared/hash";

/**
 * 連續多少手「沒有翻子也沒有吃子」就判和。
 *
 * 取 60 手（雙方各 30 手）。依據：暗棋盤面只有 4×8，任一子走到任一格最多 10 步，
 * 所以任何真有內容的攻殺計畫，在雙方各 30 手內一定能完成或被化解；
 * 超過就只是在原地兜圈子。象棋那邊用 120 手（60 回合），暗棋盤面約為象棋的
 * 1/3、且子力只減不增、沒有兵種升變之類的長期計畫，因此取其一半。
 */
export const BANQI_NO_PROGRESS_LIMIT = 60;

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
  // 和局沒有贏家。少了這一行，下面的「無步可走者負」會把和局誤判成一方獲勝——
  // 因為 getLegalMoves 對 isDraw 局面一律回傳空陣列。
  if (state.isDraw === true) return null;

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

/**
 * 局面簽章：三次重複偵測的比對單位。
 *
 * ⚠️ 隱藏資訊紅線：未翻開的棋子一律只寫成 "#"，**絕對不能**寫入它的
 * player / type / rank / id。暗棋的核心機制就是隱藏身分，簽章若帶上真實身分，
 * 簽章本身（以及它進到存檔、進到任何除錯輸出）就變成洩漏管道。
 * 「哪些格子已翻開」本來就是公開資訊，所以要寫進簽章——否則翻子前後
 * 會被誤判成同一個局面。
 */
export function positionSignature(state: BanqiState): string {
  const cells: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;
      cells.push(
        piece.isRevealed ? `${r},${c}:${piece.player}-${piece.type}` : `${r},${c}:#`
      );
    }
  }
  const p1 = state.player1Color ?? "-";
  return `${state.currentPlayer}|${p1}|${cells.join(";")}`;
}

/** 三次重複偵測存的是簽章的雜湊（32 個十六進位字元），與象棋共用同一套，避免存檔膨脹。 */
function hashedSignature(state: BanqiState): string {
  return hashSignature(positionSignature(state));
}

export function applyMoveUnchecked(state: BanqiState, move: BanqiMove): BanqiState {
  const board = cloneBoard(state.board);
  let player1Color = state.player1Color;
  let captured = false;

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

    captured = board[move.to.row][move.to.col] !== null;
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

  // 翻子與吃子都讓局面不可逆地前進：翻開的子不會再蓋回去、被吃的子不會回來。
  // 因此這兩種手一出現，先前累積的重複局面紀錄全部作廢，可以直接清空。
  const isProgress = move.type === "flip" || captured;

  const nextState: BanqiState = {
    board,
    currentPlayer: nextPlayer,
    player1Color,
    winner: null,
    moveNumber: state.moveNumber + 1,
  };

  const winner = getWinner(nextState);

  if (winner !== null) {
    return { ...nextState, winner };
  }

  if (isProgress) {
    return { ...nextState, winner, nonProgressCount: 0 };
  }

  const nonProgressCount = (state.nonProgressCount ?? 0) + 1;

  // 上一段紀錄若不存在（剛剛才結束一段有進展的手），就以「走這一手之前的局面」開頭。
  const positionHistory: string[] =
    state.positionHistory !== undefined && state.positionHistory.length > 0
      ? [...state.positionHistory]
      : [hashedSignature(state)];

  const currentSig = hashedSignature(nextState);
  positionHistory.push(currentSig);

  let occurrences = 0;
  for (const sig of positionHistory) {
    if (sig === currentSig) occurrences++;
  }

  const isDraw = occurrences >= 3 || nonProgressCount >= BANQI_NO_PROGRESS_LIMIT;

  return {
    ...nextState,
    winner,
    isDraw: isDraw ? true : undefined,
    positionHistory,
    nonProgressCount,
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
