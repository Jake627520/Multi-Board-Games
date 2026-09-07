import { GameRegistry } from "../core/game/registry";
import { createXiangqiEngine } from "./xiangqi/engine";
import { createGomokuEngine } from "./gomoku/engine";
import { createBanqiEngine } from "./banqi/engine";

export function createGameRegistry(): GameRegistry {
  const registry = new GameRegistry();
  registry.register(createXiangqiEngine());
  registry.register(createGomokuEngine());
  registry.register(createBanqiEngine());
  return registry;
}