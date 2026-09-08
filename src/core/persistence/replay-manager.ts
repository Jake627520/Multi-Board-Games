import type { GameEngine, GameViewContext } from "../game/types";
import type { GameSession } from "../game/session";
import type { GameReplayEnvelope } from "./types";
import { CURRENT_ENGINE_VERSION, CURRENT_SAVE_FORMAT_VERSION } from "./save-manager";

export class ReplaySession<State, Move, ViewState = State> {
  private currentStep = 0;
  private readonly stepStates: State[] = [];

  constructor(
    private readonly envelope: GameReplayEnvelope<Move>,
    private readonly engine: GameEngine<State, Move, ViewState>
  ) {
    // Deterministically precalculate all intermediate states from initial state
    let state = engine.deserialize(envelope.initialState);
    this.stepStates.push(state);

    for (const record of envelope.moves) {
      state = engine.applyMove(state, record.move);
      this.stepStates.push(state);
    }
  }

  getStepCount(): number {
    return this.envelope.moves.length;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Steps to an arbitrary point in the replay (trusted full state).
   */
  stepTo(step: number): State {
    if (step < 0 || step >= this.stepStates.length) {
      throw new Error(`Step index out of bounds: 0 to ${this.stepStates.length - 1} allowed, got ${step}`);
    }
    this.currentStep = step;
    return this.stepStates[step];
  }

  /**
   * Projects the state at the specified step using the provided view context.
   */
  viewAt(step: number, context: GameViewContext): ViewState {
    if (step < 0 || step >= this.stepStates.length) {
      throw new Error(`Step index out of bounds: 0 to ${this.stepStates.length - 1} allowed, got ${step}`);
    }
    return this.engine.projectView(this.stepStates[step], context);
  }

  /**
   * Exports an array of safe ViewStates corresponding to each step in the replay.
   * Guarantees that hidden information is projected per-step, with unrevealed pieces
   * completely sanitized.
   */
  exportPublicReplay(context: GameViewContext): string {
    const views = this.stepStates.map((st) => this.engine.projectView(st, context));
    return JSON.stringify(views);
  }
}

export class ReplayManager {
  /**
   * Creates a GameReplayEnvelope from a live GameSession.
   */
  createReplay<State, Move, ViewState>(
    session: GameSession<State, Move, ViewState>,
    engine: GameEngine<State, Move, ViewState>
  ): GameReplayEnvelope<Move> {
    return {
      formatVersion: CURRENT_SAVE_FORMAT_VERSION,
      gameId: engine.id,
      engineVersion: CURRENT_ENGINE_VERSION,
      initialState: engine.serialize(session.getInitialState()),
      moves: [...session.getHistory()],
    };
  }

  /**
   * Validates and loads a replay envelope into an independent ReplaySession.
   */
  loadReplay<State, Move, ViewState>(
    envelope: GameReplayEnvelope<Move>,
    engine: GameEngine<State, Move, ViewState>
  ): ReplaySession<State, Move, ViewState> {
    if (!envelope || typeof envelope !== "object") {
      throw new Error("Invalid replay envelope");
    }
    if (envelope.formatVersion !== CURRENT_SAVE_FORMAT_VERSION) {
      throw new Error(`Unsupported format version: ${String(envelope.formatVersion)}`);
    }
    if (envelope.gameId !== engine.id) {
      throw new Error(`Game ID mismatch: Envelope is for '${envelope.gameId}', expected '${engine.id}'`);
    }
    if (!Array.isArray(envelope.moves)) {
      throw new Error("Invalid replay envelope: Missing moves list");
    }

    return new ReplaySession(envelope, engine);
  }
}
