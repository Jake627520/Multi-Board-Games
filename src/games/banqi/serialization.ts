/**
 * 暗棋緊湊序列化格式 "BQK1"。
 *
 * ⚠️ 這是「權威完整狀態」的序列化（對應 engine.serialize / engine.deserialize），
 * 未翻開棋子的真實身分照樣完整保存在這裡 —— 這跟現有行為一致（JSON.stringify(state)
 * 本來就存了未翻開棋子的真實 type/player/rank）。
 * 絕對不要把這個模組的邏輯拿去用在 serializeView／projectBanqiView 上，
 * 那是給玩家看的投影，未翻開棋子必須是 `hidden-${r}-${c}`，兩者不可共用資料流。
 *
 * 格式：BQK1|<board>|<currentPlayer>|<player1Color>|<winner>|<isDraw>|<moveNumber>|<idOverrides>
 *
 * <board>：4 列（用 "/" 分隔），每列 8 格。空格用數字 run-length 表示；
 * 棋子 token = 「棋子字母（紅大寫黑小寫，沿用象棋字母表）+ 翻開旗標(0/1) + 流水號數字」，
 * 例如 "R15" = 紅方車、已翻開、流水號 5。rank 由 type 透過 PIECE_RANKS 反推，不另外存。
 */
import type { BanqiFullState, BanqiPiece, BanqiPlayer } from "./types";
import { PIECE_RANKS } from "./board";
import { decodeBoard, encodeBoard } from "../shared/board-fen";
import { decodePieceLetter, encodePieceLetter, extractStandardIdSuffix, buildStandardId } from "../shared/piece-codes";
import {
  ABSENT,
  assertPartCount,
  decodeIdOverrides,
  decodeOptionalBool,
  decodeRequiredInt,
  encodeIdOverrides,
  encodeOptionalBool,
  type IdOverride,
} from "../shared/compact-fields";
import type { PieceType } from "../xiangqi/types";

const VERSION_TAG = "BQK1";
const ROWS = 4;
const COLS = 8;
const FIELD_COUNT = 8; // including version tag

function playerToCode(player: BanqiPlayer): string {
  return player === "red" ? "r" : "b";
}
function codeToPlayer(code: string, context: string): BanqiPlayer {
  if (code === "r") return "red";
  if (code === "b") return "black";
  throw new Error(`${context}: invalid player code "${code}"`);
}
function nullablePlayerToCode(player: BanqiPlayer | null): string {
  return player === null ? "-" : playerToCode(player);
}
function codeToNullablePlayer(code: string, context: string): BanqiPlayer | null {
  if (code === "-") return null;
  return codeToPlayer(code, context);
}

function encodeBanqiBoard(board: BanqiFullState["board"]): { fen: string; overrides: IdOverride[] } {
  const overrides: IdOverride[] = [];
  const rows: (string | null)[][] = board.map((row, r) =>
    row.map((piece, c) => {
      if (!piece) return null;
      const letter = encodePieceLetter(piece.type, piece.player);
      const revealedFlag = piece.isRevealed ? "1" : "0";
      const suffix = extractStandardIdSuffix(piece.id, piece.player, piece.type);
      if (suffix !== null) {
        return `${letter}${revealedFlag}${suffix}`;
      }
      overrides.push({ row: r, col: c, id: piece.id });
      return `${letter}${revealedFlag}0`;
    })
  );
  return { fen: encodeBoard(rows), overrides };
}

function decodeBanqiBoard(fen: string, overrides: IdOverride[]): (BanqiPiece | null)[][] {
  const board = decodeBoard(fen, ROWS, COLS, (token, r, c): BanqiPiece => {
    const m = /^([a-zA-Z])([01])(\d+)$/.exec(token);
    if (!m) throw new Error(`Invalid banqi board token "${token}" at (${r},${c})`);
    const { type, player } = decodePieceLetter(m[1]);
    const isRevealed = m[2] === "1";
    const suffix = m[3];
    return {
      id: buildStandardId(player, type, suffix),
      player,
      type,
      rank: PIECE_RANKS[type],
      isRevealed,
    };
  });

  for (const o of overrides) {
    const cell = board[o.row]?.[o.col];
    if (!cell) throw new Error(`idOverride targets empty cell at (${o.row},${o.col})`);
    board[o.row][o.col] = { ...cell, id: o.id };
  }
  return board;
}

export function serializeBanqiState(state: BanqiFullState): string {
  const { fen, overrides } = encodeBanqiBoard(state.board);
  const parts = [
    VERSION_TAG,
    fen,
    playerToCode(state.currentPlayer),
    nullablePlayerToCode(state.player1Color),
    nullablePlayerToCode(state.winner),
    encodeOptionalBool(state.isDraw),
    String(state.moveNumber),
    encodeIdOverrides(overrides),
  ];
  return parts.join("|");
}

function decodeCompactBanqiState(serialized: string): BanqiFullState {
  const parts = serialized.split("|");
  assertPartCount(parts, FIELD_COUNT, "Invalid BQK1 payload");
  const [, fen, currentPlayerCode, player1ColorCode, winnerCode, isDrawStr, moveNumberStr, idOverridesStr] = parts;

  const overrides = decodeIdOverrides(idOverridesStr, "Invalid BQK1 idOverrides");
  const board = decodeBanqiBoard(fen, overrides);

  return {
    board,
    currentPlayer: codeToPlayer(currentPlayerCode, "Invalid BQK1 currentPlayer"),
    player1Color: codeToNullablePlayer(player1ColorCode, "Invalid BQK1 player1Color"),
    winner: codeToNullablePlayer(winnerCode, "Invalid BQK1 winner"),
    isDraw: decodeOptionalBool(isDrawStr, "Invalid BQK1 isDraw"),
    moveNumber: decodeRequiredInt(moveNumberStr, "Invalid BQK1 moveNumber"),
  };
}

function isPieceType(v: unknown): v is PieceType {
  return (
    v === "general" ||
    v === "advisor" ||
    v === "elephant" ||
    v === "horse" ||
    v === "chariot" ||
    v === "cannon" ||
    v === "soldier"
  );
}

function validateLegacyBanqiState(obj: unknown): BanqiFullState {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid legacy banqi state: not an object");
  }
  const s = obj as Record<string, unknown>;
  if (!Array.isArray(s.board) || s.board.length !== ROWS) {
    throw new Error(`Invalid legacy banqi state: board must be an array of ${ROWS} rows`);
  }
  for (const row of s.board) {
    if (!Array.isArray(row) || row.length !== COLS) {
      throw new Error(`Invalid legacy banqi state: each board row must have ${COLS} cells`);
    }
    for (const cell of row) {
      if (cell === null) continue;
      if (typeof cell !== "object") {
        throw new Error("Invalid legacy banqi state: board cell must be null or a piece object");
      }
      const p = cell as Record<string, unknown>;
      if (typeof p.id !== "string") throw new Error("Invalid legacy banqi state: piece.id must be a string");
      if (p.player !== "red" && p.player !== "black") {
        throw new Error("Invalid legacy banqi state: piece.player must be 'red'|'black'");
      }
      if (!isPieceType(p.type)) {
        throw new Error(`Invalid legacy banqi state: piece.type "${String(p.type)}" is unknown`);
      }
      if (typeof p.rank !== "number") {
        throw new Error("Invalid legacy banqi state: piece.rank must be a number");
      }
      if (typeof p.isRevealed !== "boolean") {
        throw new Error("Invalid legacy banqi state: piece.isRevealed must be a boolean");
      }
    }
  }
  if (s.currentPlayer !== "red" && s.currentPlayer !== "black") {
    throw new Error("Invalid legacy banqi state: currentPlayer must be 'red'|'black'");
  }
  if (s.player1Color !== null && s.player1Color !== "red" && s.player1Color !== "black") {
    throw new Error("Invalid legacy banqi state: player1Color must be null|'red'|'black'");
  }
  if (s.winner !== null && s.winner !== "red" && s.winner !== "black") {
    throw new Error("Invalid legacy banqi state: winner must be null|'red'|'black'");
  }
  if (typeof s.moveNumber !== "number") {
    throw new Error("Invalid legacy banqi state: moveNumber must be a number");
  }
  return s as unknown as BanqiFullState;
}

export function deserializeBanqiState(serialized: string): BanqiFullState {
  if (typeof serialized !== "string" || serialized.length === 0) {
    throw new Error("Invalid banqi serialized payload: expected a non-empty string");
  }
  if (serialized.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch (err) {
      throw new Error(`Malformed legacy banqi JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    return validateLegacyBanqiState(parsed);
  }
  if (serialized.startsWith(`${VERSION_TAG}|`)) {
    return decodeCompactBanqiState(serialized);
  }
  throw new Error(`Unrecognized banqi serialized format (expected legacy JSON or "${VERSION_TAG}|...")`);
}
