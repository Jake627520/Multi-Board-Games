import { useCallback, useMemo, useRef, useState, type ComponentType } from "react";
import type { BoardProps } from "./ui/board-props";
import { createGameRegistry } from "./games/registry";
import { XiangqiBoard } from "./ui/XiangqiBoard";
import { GomokuBoard } from "./ui/components/GomokuBoard";
import { BanqiBoard } from "./ui/components/BanqiBoard";
import { GameSwitcher } from "./ui/components/GameSwitcher";
import { GameHome } from "./ui/components/GameHome";
import { readLastGame, writeLastGame } from "./ui/last-game";
import type { GameId } from "./core/game/types";

/**
 * 唯一的擴充點：新棋種在此登記一次即可。
 * 查不到的 id 會落到 Placeholder，不會與棋盤同時渲染。
 */
const boards: Record<GameId, ComponentType<BoardProps> | undefined> = {
  xiangqi: XiangqiBoard,
  gomoku: GomokuBoard,
  banqi: BanqiBoard,
};

export default function App() {
  const registry = useMemo(() => createGameRegistry(), []);
  const [gameId, setGameId] = useState<GameId | null>(null);
  const [lastGameId, setLastGameId] = useState<GameId | null>(() => readLastGame());

  // 用 ref 而非 state：只在切換當下讀取，不需要為此重新渲染 App
  const inProgressRef = useRef(false);
  const handleProgressChange = useCallback((inProgress: boolean) => {
    inProgressRef.current = inProgress;
  }, []);

  const confirmLeave = useCallback(
    (message: string) => {
      if (!inProgressRef.current) return true;
      return window.confirm(message);
    },
    []
  );

  const enterGame = useCallback((id: GameId) => {
    inProgressRef.current = false;
    writeLastGame(id);
    setLastGameId(id);
    setGameId(id);
  }, []);

  const switchGame = useCallback(
    (id: GameId) => {
      if (id === gameId) return;
      if (!confirmLeave("本局尚未結束，切換遊戲會放棄目前棋局。確定要離開嗎？")) {
        return;
      }
      enterGame(id);
    },
    [confirmLeave, enterGame, gameId]
  );

  const goHome = useCallback(() => {
    if (!confirmLeave("本局尚未結束，回首頁會放棄目前棋局。確定要離開嗎？")) {
      return;
    }
    inProgressRef.current = false;
    setGameId(null);
  }, [confirmLeave]);

  const Board = gameId === null ? undefined : boards[gameId];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">MULTI BOARD GAMES PLATFORM</div>
          <h1>多棋類遊戲平台</h1>
        </div>
        {gameId !== null && (
          <div className="topbar-nav">
            <button
              type="button"
              className="home-link"
              data-testid="back-to-home"
              onClick={goHome}
            >
              ← 回首頁
            </button>
            <GameSwitcher
              currentGameId={gameId}
              availableGames={registry.list()}
              onSelectGame={switchGame}
            />
          </div>
        )}
      </header>

      {gameId === null ? (
        <GameHome
          games={registry.list()}
          lastGameId={lastGameId}
          onSelectGame={enterGame}
        />
      ) : Board ? (
        <Board key={gameId} onProgressChange={handleProgressChange} />
      ) : (
        <section className="placeholder">
          <h2>{registry.get(gameId)?.name || gameId}</h2>
          <p>此遊戲已保留擴充位置，尚未加入 Game Engine。</p>
        </section>
      )}
    </main>
  );
}
