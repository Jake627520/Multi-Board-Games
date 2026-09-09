import type { GameEngine, MoveRecord } from "../game/types";
import type { GameSession, SessionRestorePayload } from "../game/session";
import type { GameSaveEnvelope, SaveFormatVersion } from "./types";

export const CURRENT_SAVE_FORMAT_VERSION = 2;

/**
 * 仍可被載入的存檔格式版本。
 * v1：僅有 state（無棋譜），載入後棋譜視為空陣列。
 * v2：state + initialState + history，載入後悔棋與復盤皆可用。
 */
export const SUPPORTED_SAVE_FORMAT_VERSIONS: readonly SaveFormatVersion[] = [1, 2];

export const CURRENT_ENGINE_VERSION = "0.12.0";

export class SaveManager {
  /**
   * Serializes current session authoritative state into a versioned GameSaveEnvelope.
   * v2 起同時保存起始局面與完整棋譜，使載入端能重建悔棋快照與復盤。
   */
  save<State, Move, ViewState>(
    session: GameSession<State, Move, ViewState>,
    engine: GameEngine<State, Move, ViewState>
  ): string {
    const envelope: GameSaveEnvelope<Move> = {
      formatVersion: CURRENT_SAVE_FORMAT_VERSION,
      gameId: engine.id,
      engineVersion: CURRENT_ENGINE_VERSION,
      state: engine.serialize(session.getState()),
      initialState: engine.serialize(session.getInitialState()),
      history: [...session.getHistory()],
      savedAt: new Date().toISOString(),
    };
    return JSON.stringify(envelope);
  }

  /**
   * Strictly validates and deserializes a GameSaveEnvelope.
   * If any validation check fails, the live session is left completely unmodified.
   */
  load<State, Move, ViewState>(
    envelopeJson: string,
    session: GameSession<State, Move, ViewState>,
    engine: GameEngine<State, Move, ViewState>
  ): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(envelopeJson);
    } catch {
      throw new Error("Malformed JSON: Failed to parse save envelope");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid envelope: Payload must be an object");
    }

    const env = parsed as Record<string, unknown>;

    if (
      typeof env.formatVersion !== "number" ||
      !SUPPORTED_SAVE_FORMAT_VERSIONS.includes(env.formatVersion as SaveFormatVersion)
    ) {
      throw new Error(
        `Unsupported format version: Expected one of ${SUPPORTED_SAVE_FORMAT_VERSIONS.join(", ")}, got ${String(env.formatVersion)}`
      );
    }
    const formatVersion = env.formatVersion as SaveFormatVersion;

    if (typeof env.gameId !== "string" || env.gameId !== engine.id) {
      throw new Error(
        `Game ID mismatch: Envelope is for '${String(env.gameId)}', but target session engine is '${engine.id}'`
      );
    }

    if (typeof env.engineVersion !== "string" || env.engineVersion.trim().length === 0) {
      throw new Error("Invalid envelope: Missing or invalid engineVersion");
    }

    if (typeof env.state !== "string" || env.state.trim().length === 0) {
      throw new Error("Invalid envelope: Missing or empty state payload");
    }

    // Atomic deserialization & state sanity check
    let candidateState: State;
    try {
      candidateState = engine.deserialize(env.state);
      if (!candidateState || typeof candidateState !== "object") {
        throw new Error("Deserialized state is invalid");
      }
      // Verify basic engine interface validity on deserialized state
      engine.getCurrentPlayer(candidateState);
      engine.isGameOver(candidateState);
    } catch (err) {
      throw new Error(`Corrupted state payload: ${err instanceof Error ? err.message : String(err)}`);
    }

    // v1 存檔沒有棋譜：維持既有 clean baseline 語義（無棋譜、無悔棋快照）
    if (formatVersion < 2 || env.history === undefined) {
      session.loadState(candidateState);
      return;
    }

    // v2：以 initialState + history 重建悔棋快照與復盤起點。
    // 全部計算完成並驗證通過後才寫入 session，維持「驗證失敗不動 live session」的保證。
    const payload = this.rebuildRestorePayload(env, candidateState, engine);
    session.restoreFrom(payload);
  }

  /**
   * 重放存檔中的棋譜，重建每一步之前的局面（悔棋快照），
   * 並驗證重放結果與存檔中的權威局面完全一致。
   */
  private rebuildRestorePayload<State, Move, ViewState>(
    env: Record<string, unknown>,
    candidateState: State,
    engine: GameEngine<State, Move, ViewState>
  ): SessionRestorePayload<State, Move> {
    if (!Array.isArray(env.history)) {
      throw new Error("Invalid envelope: history must be an array");
    }
    if (typeof env.initialState !== "string" || env.initialState.trim().length === 0) {
      throw new Error("Invalid envelope: v2 save requires an initialState payload");
    }

    const history: MoveRecord<Move>[] = env.history.map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error(`Invalid history entry at index ${index}: must be an object`);
      }
      const record = entry as Record<string, unknown>;
      if (record.move === undefined) {
        throw new Error(`Invalid history entry at index ${index}: missing move`);
      }
      if (typeof record.player !== "string") {
        throw new Error(`Invalid history entry at index ${index}: missing player`);
      }
      if (record.notation !== undefined && typeof record.notation !== "string") {
        throw new Error(`Invalid history entry at index ${index}: notation must be a string`);
      }
      return {
        move: record.move as Move,
        player: record.player,
        notation: record.notation as string | undefined,
      };
    });

    let initialState: State;
    const snapshots: State[] = [];
    let replayed: State;
    try {
      initialState = engine.deserialize(env.initialState);
      replayed = initialState;
      for (const record of history) {
        snapshots.push(replayed);
        replayed = engine.applyMove(replayed, record.move);
      }
    } catch (err) {
      throw new Error(
        `Corrupted history payload: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (engine.serialize(replayed) !== env.state) {
      throw new Error(
        "Corrupted history payload: Replaying the saved history does not reproduce the saved state"
      );
    }

    return { state: candidateState, initialState, history, snapshots };
  }
}
