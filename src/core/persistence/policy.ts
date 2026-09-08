import type { GameEngine, GameViewContext } from "../game/types";
import type { GameSession } from "../game/session";
import { PersistenceTarget } from "./types";

export { PersistenceTarget };

/**
 * Public Export Serialization Guard
 * Guarantees that public exports always project through ViewState
 * and never serialize raw authoritative full state.
 */
export function exportPublicView<State, Move, ViewState>(
  session: GameSession<State, Move, ViewState>,
  engine: GameEngine<State, Move, ViewState>,
  context: GameViewContext
): string {
  const viewState = session.getView(context);
  return engine.serializeView(viewState);
}
