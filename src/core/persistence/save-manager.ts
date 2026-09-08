import type { GameEngine } from "../game/types";
import type { GameSession } from "../game/session";
import type { GameSaveEnvelope } from "./types";

export const CURRENT_SAVE_FORMAT_VERSION = 1;
export const CURRENT_ENGINE_VERSION = "0.12.0";

export class SaveManager {
  /**
   * Serializes current session authoritative state into a versioned GameSaveEnvelope.
   */
  save<State, Move, ViewState>(
    session: GameSession<State, Move, ViewState>,
    engine: GameEngine<State, Move, ViewState>
  ): string {
    const envelope: GameSaveEnvelope = {
      formatVersion: CURRENT_SAVE_FORMAT_VERSION,
      gameId: engine.id,
      engineVersion: CURRENT_ENGINE_VERSION,
      state: engine.serialize(session.getState()),
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

    if (typeof env.formatVersion !== "number" || env.formatVersion !== CURRENT_SAVE_FORMAT_VERSION) {
      throw new Error(
        `Unsupported format version: Expected ${CURRENT_SAVE_FORMAT_VERSION}, got ${String(env.formatVersion)}`
      );
    }

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

    // All validation passed: atomically replace session state & reset baseline
    session.loadState(candidateState);
  }
}
