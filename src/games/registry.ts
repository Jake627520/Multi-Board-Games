import { GameRegistry } from "../core/game/registry";
import { createXiangqiEngine } from "./xiangqi/engine";

export function createGameRegistry(): GameRegistry {
  const registry = new GameRegistry();
  registry.register(createXiangqiEngine());
  return registry;
}