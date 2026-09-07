import type { GameEngine, GameId } from "./types";

export class GameRegistry {
  private readonly engines = new Map<GameId, GameEngine<unknown, unknown>>();

  register<State, Move>(engine: GameEngine<State, Move>): void {
    if (this.engines.has(engine.id)) {
      throw new Error(`Game engine already registered: ${engine.id}`);
    }
    this.engines.set(engine.id, engine as GameEngine<unknown, unknown>);
  }

  get(id: GameId) {
    return this.engines.get(id);
  }

  list() {
    return [...this.engines.values()];
  }
}