import { useMemo, useState } from "react";
import { createGameRegistry } from "./games/registry";
import { XiangqiBoard } from "./ui/XiangqiBoard";
import { GomokuBoard } from "./ui/components/GomokuBoard";
import { BanqiBoard } from "./ui/components/BanqiBoard";
import { GameSwitcher } from "./ui/components/GameSwitcher";
import type { GameId } from "./core/game/types";

export default function App() {
  const registry = useMemo(() => createGameRegistry(), []);
  const [gameId, setGameId] = useState<GameId>("xiangqi");

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">MULTI BOARD GAMES PLATFORM</div>
          <h1>多棋類遊戲平台</h1>
        </div>
        <GameSwitcher
          currentGameId={gameId}
          availableGames={registry.list()}
          onSelectGame={setGameId}
        />
      </header>

      {gameId === "xiangqi" && <XiangqiBoard key="xiangqi" />}
      {gameId === "gomoku" && <GomokuBoard key="gomoku" />}
      {gameId === "banqi" && <BanqiBoard key="banqi" />}

      {gameId !== "xiangqi" && gameId !== "gomoku" && gameId !== "banqi" && (
        <section className="placeholder">
          <h2>{registry.get(gameId)?.name || gameId}</h2>
          <p>此遊戲已保留擴充位置，尚未加入 Game Engine。</p>
        </section>
      )}
    </main>
  );
}