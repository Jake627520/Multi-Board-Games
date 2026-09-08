import type { GameId, MoveRecord } from "../game/types";

export interface GameSaveEnvelope {
  readonly formatVersion: 1;
  readonly gameId: GameId;
  readonly engineVersion: string;
  readonly state: string;
  readonly savedAt: string; // ISO 8601 string
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
