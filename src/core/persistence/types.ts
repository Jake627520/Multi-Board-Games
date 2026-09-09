import type { GameId, MoveRecord } from "../game/types";

/** Save envelope 格式版本：1 = 僅狀態；2 = 狀態 + 棋譜（可復盤／可悔棋）。 */
export type SaveFormatVersion = 1 | 2;

export interface GameSaveEnvelope<Move = unknown> {
  readonly formatVersion: SaveFormatVersion;
  readonly gameId: GameId;
  readonly engineVersion: string;
  readonly state: string;
  readonly savedAt: string; // ISO 8601 string
  /**
   * v2+：本局完整棋譜。v1 舊存檔沒有此欄位，載入時視為空陣列。
   */
  readonly history?: readonly MoveRecord<Move>[];
  /**
   * v2+：本局起始狀態（序列化）。與 history 一起用於重建 undo 快照與復盤起點；
   * 暗棋等含隨機開局的遊戲無法由 createInitialState() 重現，故必須隨存檔保存。
   */
  readonly initialState?: string;
}

export interface GameReplayEnvelope<Move = unknown> {
  readonly formatVersion: 1;
  readonly gameId: GameId;
  readonly engineVersion: string;
  readonly initialState: string;
  readonly moves: readonly MoveRecord<Move>[];
}

export const PersistenceTarget = {
  TRUSTED_SAVE: "TRUSTED_SAVE",
  TRUSTED_REPLAY: "TRUSTED_REPLAY",
  PUBLIC_EXPORT: "PUBLIC_EXPORT",
  PUBLIC_REPLAY: "PUBLIC_REPLAY",
} as const;

export type PersistenceTarget = (typeof PersistenceTarget)[keyof typeof PersistenceTarget];
