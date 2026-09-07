import { useMemo, useState } from "react";
import { createGameRegistry } from "./games/registry";
import { XiangqiBoard } from "./ui/XiangqiBoard";
import type { GameId } from "./core/game/types";

export default function App() {
  const registry = useMemo(() => createGameRegistry(), []);
  const [gameId, setGameId] = useState<GameId>("xiangqi");

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">MULTI BOARD GAMES</div>
          <h1>多棋類遊戲平台</h1>
        </div>
        <select value={gameId} onChange={(e) => setGameId(e.target.value as GameId)}>
          {registry.list().map((game) => (
            <option key={game.id} value={game.id}>{game.name}</option>
          ))}
        </select>
      </header>

      {gameId === "xiangqi" ? (
        <XiangqiBoard />
      ) : (
        <section className="placeholder">
          <h2>{registry.get(gameId)?.name}</h2>
          <p>此遊戲已保留擴充位置，尚未加入 Game Engine。</p>
        </section>
      )}
    </main>
  );
}