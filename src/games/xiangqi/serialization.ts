/**
 * 象棋緊湊序列化格式 "XQK1"。
 *
 * 格式：XQK1|<board>|<currentPlayer>|<winner>|<moveNumber>|<isDraw>|<terminationReason>
 *            |<positionHistory>|<checkHistory>|<nonCaptureCount>|<idOverrides>
 *
 * <board>：10 列（列與列用 "/" 分隔），每列 9 格。空格用數字 run-length 表示，
 * 棋子用「棋子字母 + 流水號數字」表示（紅方大寫、黑方小寫）；棋子的 (row, col)
 * 完全由陣列索引決定，不再另外存 position。
 *
 * 舊格式相容：deserialize 同時接受這個緊湊格式，以及舊版 `JSON.stringify(state)`
 * 的原始 JSON（一律以 "{" 開頭辨識）。
 */
import type { Piece, PieceType, XiangqiPlayer, XiangqiState } from "./types";
import { decodeBoard as sharedDecodeBoard, encodeBoard as sharedEncodeBoardRows } from "../shared/board-fen";
import { decodePieceLetter, encodePieceLetter, extractStandardIdSuffix, buildStandardId } from "../shared/piece-codes";
import {
  ABSENT,
  assertPartCount,
  decodeIdOverrides,
  decodeOptionalBool,
  decodeOptionalInt,
  decodeRequiredInt,
  encodeIdOverrides,
  encodeOptionalBool,
  encodeOptionalInt,
  type IdOverride,
} from "../shared/compact-fields";

const VERSION_TAG = "XQK1";
const ROWS = 10;
const COLS = 9;
const FIELD_COUNT = 11; // including version tag

const TERMINATION_TO_CODE: Record<NonNullable<XiangqiState["terminationReason"]>, string> = {
  checkmate: "cm",
  stalemate: "sm",
  perpetual_check: "pc",
  perpetual_chase: "pch",
  threefold_repetition: "tr",
  sixty_move_draw: "s60",
};
const CODE_TO_TERMINATION: Record<string, NonNullable<XiangqiState["terminationReason"]>> =
  Object.fromEntries(Object.entries(TERMINATION_TO_CODE).map(([k, v]) => [v, k as NonNullable<XiangqiState["terminationReason"]>]));

function playerToCode(player: XiangqiPlayer): string {
  return player === "red" ? "r" : "b";
}
function codeToPlayer(code: string, context: string): XiangqiPlayer {
  if (code === "r") return "red";
  if (code === "b") return "black";
  throw new Error(`${context}: invalid player code "${code}"`);
}
function winnerToCode(winner: XiangqiPlayer | null): string {
  return winner === null ? "-" : playerToCode(winner);
}
function codeToWinner(code: string, context: string): XiangqiPlayer | null {
  if (code === "-") return null;
  return codeToPlayer(code, context);
}

function encodeXiangqiBoard(board: XiangqiState["board"]): { fen: string; overrides: IdOverride[] } {
  const overrides: IdOverride[] = [];
  const rows: (string | null)[][] = board.map((row, r) =>
    row.map((piece, c) => {
      if (!piece) return null;
      const letter = encodePieceLetter(piece.type, piece.player);
      const suffix = extractStandardIdSuffix(piece.id, piece.player, piece.type);
      if (suffix !== null) {
        return `${letter}${suffix}`;
      }
      overrides.push({ row: r, col: c, id: piece.id });
      return `${letter}0`;
    })
  );
  return { fen: sharedEncodeBoardRows(rows), overrides };
}

function decodeXiangqiBoard(fen: string, overrides: IdOverride[]): (Piece | null)[][] {
  const board = sharedDecodeBoard(fen, ROWS, COLS, (token, r, c): Piece => {
    const letterMatch = /^([a-zA-Z])(\d+)$/.exec(token);
    if (!letterMatch) throw new Error(`Invalid xiangqi board token "${token}" at (${r},${c})`);
    const { type, player } = decodePieceLetter(letterMatch[1]);
    const suffix = letterMatch[2];
    return {
      id: buildStandardId(player, type, suffix),
      player,
      type,
      position: { row: r, col: c },
    };
  });

  for (const o of overrides) {
    const cell = board[o.row]?.[o.col];
    if (!cell) throw new Error(`idOverride targets empty cell at (${o.row},${o.col})`);
    board[o.row][o.col] = { ...cell, id: o.id };
  }
  return board;
}

export function serializeXiangqiState(state: XiangqiState): string {
  const { fen, overrides } = encodeXiangqiBoard(state.board);

  const positionHistory =
    state.positionHistory === undefined ? ABSENT : state.positionHistory.join("^");
  const checkHistory =
    state.checkHistory === undefined ? ABSENT : state.checkHistory.map((b) => (b ? "1" : "0")).join("");
  const terminationReason =
    state.terminationReason === undefined ? ABSENT : TERMINATION_TO_CODE[state.terminationReason];

  const parts = [
    VERSION_TAG,
    fen,
    playerToCode(state.currentPlayer),
    winnerToCode(state.winner),
    String(state.moveNumber),
    encodeOptionalBool(state.isDraw),
    terminationReason,
    positionHistory,
    checkHistory,
    encodeOptionalInt(state.nonCaptureCount),
    encodeIdOverrides(overrides),
  ];
  return parts.join("|");
}

function decodeCompactXiangqiState(serialized: string): XiangqiState {
  const parts = serialized.split("|");
  assertPartCount(parts, FIELD_COUNT, "Invalid XQK1 payload");
  const [
    ,
    fen,
    currentPlayerCode,
    winnerCode,
    moveNumberStr,
    isDrawStr,
    terminationReasonStr,
    positionHistoryStr,
    checkHistoryStr,
    nonCaptureCountStr,
    idOverridesStr,
  ] = parts;

  const overrides = decodeIdOverrides(idOverridesStr, "Invalid XQK1 idOverrides");
  const board = decodeXiangqiBoard(fen, overrides);

  let terminationReason: XiangqiState["terminationReason"];
  if (terminationReasonStr !== ABSENT) {
    const decoded = CODE_TO_TERMINATION[terminationReasonStr];
    if (!decoded) throw new Error(`Invalid XQK1 terminationReason code "${terminationReasonStr}"`);
    terminationReason = decoded;
  }

  const state: XiangqiState = {
    board,
    currentPlayer: codeToPlayer(currentPlayerCode, "Invalid XQK1 currentPlayer"),
    winner: codeToWinner(winnerCode, "Invalid XQK1 winner"),
    moveNumber: decodeRequiredInt(moveNumberStr, "Invalid XQK1 moveNumber"),
    isDraw: decodeOptionalBool(isDrawStr, "Invalid XQK1 isDraw"),
    terminationReason,
    positionHistory: positionHistoryStr === ABSENT ? undefined : positionHistoryStr === "" ? [] : positionHistoryStr.split("^"),
    checkHistory:
      checkHistoryStr === ABSENT
        ? undefined
        : checkHistoryStr.split("").map((c) => {
            if (c !== "0" && c !== "1") throw new Error(`Invalid XQK1 checkHistory bit "${c}"`);
            return c === "1";
          }),
    nonCaptureCount: decodeOptionalInt(nonCaptureCountStr, "Invalid XQK1 nonCaptureCount"),
  };
  return state;
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

/** 對舊版 `JSON.parse` 出來的物件做最基本的執行期形狀驗證，避免裸 `as` 轉型放行壞資料。 */
function validateLegacyXiangqiState(obj: unknown): XiangqiState {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid legacy xiangqi state: not an object");
  }
  const s = obj as Record<string, unknown>;
  if (!Array.isArray(s.board) || s.board.length !== ROWS) {
    throw new Error(`Invalid legacy xiangqi state: board must be an array of ${ROWS} rows`);
  }
  for (const row of s.board) {
    if (!Array.isArray(row) || row.length !== COLS) {
      throw new Error(`Invalid legacy xiangqi state: each board row must have ${COLS} cells`);
    }
    for (const cell of row) {
      if (cell === null) continue;
      if (typeof cell !== "object") {
        throw new Error("Invalid legacy xiangqi state: board cell must be null or a piece object");
      }
      const p = cell as Record<string, unknown>;
      if (typeof p.id !== "string") throw new Error("Invalid legacy xiangqi state: piece.id must be a string");
      if (p.player !== "red" && p.player !== "black") {
        throw new Error("Invalid legacy xiangqi state: piece.player must be 'red'|'black'");
      }
      if (!isPieceType(p.type)) {
        throw new Error(`Invalid legacy xiangqi state: piece.type "${String(p.type)}" is unknown`);
      }
      if (
        !p.position ||
        typeof p.position !== "object" ||
        typeof (p.position as Record<string, unknown>).row !== "number" ||
        typeof (p.position as Record<string, unknown>).col !== "number"
      ) {
        throw new Error("Invalid legacy xiangqi state: piece.position must be {row,col}");
      }
    }
  }
  if (s.currentPlayer !== "red" && s.currentPlayer !== "black") {
    throw new Error("Invalid legacy xiangqi state: currentPlayer must be 'red'|'black'");
  }
  if (s.winner !== null && s.winner !== "red" && s.winner !== "black") {
    throw new Error("Invalid legacy xiangqi state: winner must be null|'red'|'black'");
  }
  if (typeof s.moveNumber !== "number") {
    throw new Error("Invalid legacy xiangqi state: moveNumber must be a number");
  }
  return s as unknown as XiangqiState;
}

export function deserializeXiangqiState(serialized: string): XiangqiState {
  if (typeof serialized !== "string" || serialized.length === 0) {
    throw new Error("Invalid xiangqi serialized payload: expected a non-empty string");
  }
  if (serialized.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch (err) {
      throw new Error(`Malformed legacy xiangqi JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    return validateLegacyXiangqiState(parsed);
  }
  if (serialized.startsWith(`${VERSION_TAG}|`)) {
    return decodeCompactXiangqiState(serialized);
  }
  throw new Error(`Unrecognized xiangqi serialized format (expected legacy JSON or "${VERSION_TAG}|...")`);
}
