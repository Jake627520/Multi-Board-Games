/**
 * 五子棋緊湊序列化格式 "GMK1"。
 *
 * 格式：GMK1|<board>|<currentPlayer>|<winner>|<isDraw>|<moveNumber>|<ruleMode>|<winningLine>
 *
 * <board>：15 列（用 "/" 分隔），每列 15 格。空格用數字 run-length 表示，
 * 黑子 "b"、白子 "w"（五子棋的子沒有 id，純字母即可，不吃隨後數字）。
 *
 * 舊格式相容：deserialize 同時接受這個緊湊格式，以及舊版 `JSON.stringify(state)`
 * 的原始 JSON（一律以 "{" 開頭辨識）。
 */
import type { GomokuPlayer, GomokuRuleMode, GomokuState } from "./types";
import { decodeBoard, encodeBoard } from "../shared/board-fen";
import {
  ABSENT,
  assertPartCount,
  decodeOptionalBool,
  decodeRequiredInt,
  encodeOptionalBool,
} from "../shared/compact-fields";

const VERSION_TAG = "GMK1";
const ROWS = 15;
const COLS = 15;
const FIELD_COUNT = 8; // including version tag

function playerToCode(player: GomokuPlayer): string {
  return player === "black" ? "b" : "w";
}
function codeToPlayer(code: string, context: string): GomokuPlayer {
  if (code === "b") return "black";
  if (code === "w") return "white";
  throw new Error(`${context}: invalid player code "${code}"`);
}
function winnerToCode(winner: GomokuPlayer | null): string {
  return winner === null ? "-" : playerToCode(winner);
}
function codeToWinner(code: string, context: string): GomokuPlayer | null {
  if (code === "-") return null;
  return codeToPlayer(code, context);
}

function ruleModeToCode(mode: GomokuRuleMode): string {
  return mode === "freestyle" ? "F" : "R";
}
function codeToRuleMode(code: string, context: string): GomokuRuleMode {
  if (code === "F") return "freestyle";
  if (code === "R") return "forbidden_moves";
  throw new Error(`${context}: invalid ruleMode code "${code}"`);
}

export function serializeGomokuState(state: GomokuState): string {
  const rows: (string | null)[][] = state.board.map((row) =>
    row.map((cell) => (cell === null ? null : playerToCode(cell)))
  );
  const fen = encodeBoard(rows);

  const winningLine =
    state.winningLine === undefined
      ? ABSENT
      : state.winningLine.map((p) => `${p.row},${p.col}`).join(";");

  const parts = [
    VERSION_TAG,
    fen,
    playerToCode(state.currentPlayer),
    winnerToCode(state.winner),
    encodeOptionalBool(state.isDraw),
    String(state.moveNumber),
    ruleModeToCode(state.ruleMode),
    winningLine,
  ];
  return parts.join("|");
}

function decodeCompactGomokuState(serialized: string): GomokuState {
  const parts = serialized.split("|");
  assertPartCount(parts, FIELD_COUNT, "Invalid GMK1 payload");
  const [, fen, currentPlayerCode, winnerCode, isDrawStr, moveNumberStr, ruleModeCode, winningLineStr] = parts;

  const board = decodeBoard(fen, ROWS, COLS, (token, r, c) => {
    if (token === "b") return "black" as GomokuPlayer;
    if (token === "w") return "white" as GomokuPlayer;
    throw new Error(`Invalid GMK1 board token "${token}" at (${r},${c})`);
  });

  const winningLine =
    winningLineStr === ABSENT
      ? undefined
      : winningLineStr === ""
        ? []
        : winningLineStr.split(";").map((pair) => {
            const m = /^(\d+),(\d+)$/.exec(pair);
            if (!m) throw new Error(`Invalid GMK1 winningLine entry "${pair}"`);
            return { row: Number(m[1]), col: Number(m[2]) };
          });

  return {
    board,
    currentPlayer: codeToPlayer(currentPlayerCode, "Invalid GMK1 currentPlayer"),
    winner: codeToWinner(winnerCode, "Invalid GMK1 winner"),
    isDraw: decodeOptionalBool(isDrawStr, "Invalid GMK1 isDraw"),
    moveNumber: decodeRequiredInt(moveNumberStr, "Invalid GMK1 moveNumber"),
    ruleMode: codeToRuleMode(ruleModeCode, "Invalid GMK1 ruleMode"),
    winningLine,
  };
}

function validateLegacyGomokuState(obj: unknown): GomokuState {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid legacy gomoku state: not an object");
  }
  const s = obj as Record<string, unknown>;
  if (!Array.isArray(s.board) || s.board.length !== ROWS) {
    throw new Error(`Invalid legacy gomoku state: board must be an array of ${ROWS} rows`);
  }
  for (const row of s.board) {
    if (!Array.isArray(row) || row.length !== COLS) {
      throw new Error(`Invalid legacy gomoku state: each board row must have ${COLS} cells`);
    }
    for (const cell of row) {
      if (cell !== null && cell !== "black" && cell !== "white") {
        throw new Error(`Invalid legacy gomoku state: cell must be null|'black'|'white', got "${String(cell)}"`);
      }
    }
  }
  if (s.currentPlayer !== "black" && s.currentPlayer !== "white") {
    throw new Error("Invalid legacy gomoku state: currentPlayer must be 'black'|'white'");
  }
  if (s.winner !== null && s.winner !== "black" && s.winner !== "white") {
    throw new Error("Invalid legacy gomoku state: winner must be null|'black'|'white'");
  }
  if (typeof s.moveNumber !== "number") {
    throw new Error("Invalid legacy gomoku state: moveNumber must be a number");
  }
  if (s.ruleMode !== "freestyle" && s.ruleMode !== "forbidden_moves") {
    throw new Error("Invalid legacy gomoku state: ruleMode must be 'freestyle'|'forbidden_moves'");
  }
  return s as unknown as GomokuState;
}

export function deserializeGomokuState(serialized: string): GomokuState {
  if (typeof serialized !== "string" || serialized.length === 0) {
    throw new Error("Invalid gomoku serialized payload: expected a non-empty string");
  }
  if (serialized.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch (err) {
      throw new Error(`Malformed legacy gomoku JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    return validateLegacyGomokuState(parsed);
  }
  if (serialized.startsWith(`${VERSION_TAG}|`)) {
    return decodeCompactGomokuState(serialized);
  }
  throw new Error(`Unrecognized gomoku serialized format (expected legacy JSON or "${VERSION_TAG}|...")`);
}
