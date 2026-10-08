import { useCallback, useMemo, useRef, useState, type ComponentType } from "react";
import type { BoardProps } from "./ui/board-props";
import { createGameRegistry } from "./games/registry";
import { XiangqiBoard } from "./ui/XiangqiBoard";
import { GomokuBoard } from "./ui/components/GomokuBoard";
import { BanqiBoard } from "./ui/components/BanqiBoard";
import { GameSwitcher } from "./ui/components/GameSwitcher";
import { GameHome } from "./ui/components/GameHome";
import { readLastGame, writeLastGame } from "./ui/last-game";
import { clearAutosave, hasAutosave } from "./core/persistence/autosave";
import { GameErrorBoundary } from "./ui/components/GameErrorBoundary";
import type { GameId } from "./core/game/types";
import type { GameMode } from "./ui/components/GameModeSelector";

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
  // 首頁選的對手。只是「沒有存檔時的預設」，棋盤端的優先序是 saved.mode ?? initialMode。
  const [initialMode, setInitialMode] = useState<GameMode | undefined>(undefined);
  const [lastGameId, setLastGameId] = useState<GameId | null>(() => readLastGame());

  // 用 ref 而非 state：只在切換當下讀取，不需要為此重新渲染 App
  const inProgressRef = useRef(false);
  const handleProgressChange = useCallback((inProgress: boolean) => {
    inProgressRef.current = inProgress;
  }, []);

  /**
   * 離開前的確認。有了自動存檔之後，離開通常不會失去任何東西，所以只在
   * 「真的會丟局」時才問——也就是自動存檔不可用的時候（localStorage 被
   * 停用、配額滿、寫入失敗）。先前無條件警告「會放棄目前棋局」，在棋局
   * 其實已經保存的情況下是不實的，而不實的警告會訓練使用者忽略它。
   */
  const confirmLeave = useCallback(
    (message: string) => {
      if (!inProgressRef.current) return true;
      if (gameId !== null && hasAutosave(gameId)) return true;
      return window.confirm(message);
    },
    [gameId]
  );

  const enterGame = useCallback((id: GameId, mode?: GameMode) => {
    inProgressRef.current = false;
    // 沒帶 mode（繼續上次 / 遊戲切換器 / 開新局）一律清掉，避免上一次首頁選的對手漏到別的棋種
    setInitialMode(mode);
    writeLastGame(id);
    setLastGameId(id);
    setGameId(id);
  }, []);

  /**
   * 「開新局」：丟掉該棋種的自動存檔再進入。會毀掉一局，所以有存檔時先確認
   * （與「重新開始」同標準）。
   */
  /**
   * 以指定對手「開新局」：丟掉該棋種的自動存檔再進入。會毀掉一局，所以有存檔時
   * 先確認（與「重新開始」同標準）。續局走 enterGame（不帶 mode、不清存檔）。
   */
  const startNewGame = useCallback(
    (id: GameId, mode?: GameMode) => {
      if (
        hasAutosave(id) &&
        !window.confirm("這個棋種有尚未結束的棋局，開新局會放棄它。確定要開新局嗎？")
      ) {
        return;
      }
      clearAutosave(id);
      enterGame(id, mode);
    },
    [enterGame]
  );

  const switchGame = useCallback(
    (id: GameId) => {
      if (id === gameId) return;
      if (!confirmLeave("本局無法自動保存，切換遊戲會放棄目前棋局。確定要離開嗎？")) {
        return;
      }
      enterGame(id);
    },
    [confirmLeave, enterGame, gameId]
  );

  const goHome = useCallback(() => {
    if (!confirmLeave("本局無法自動保存，回首頁會放棄目前棋局。確定要離開嗎？")) {
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
              ← 回首頁 Home
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
          canResume={hasAutosave}
          onSelectGame={enterGame}
          onNewGame={startNewGame}
        />
      ) : Board ? (
        <GameErrorBoundary
          key={gameId}
          gameId={gameId}
          onError={() => {
            // 棋盤已崩潰、自動存檔已清：離開時不該再為這局問「無法自動保存」
            inProgressRef.current = false;
          }}
          onGoHome={goHome}
        >
          <Board onProgressChange={handleProgressChange} initialMode={initialMode} />
        </GameErrorBoundary>
      ) : (
        <section className="placeholder">
          <h2>{registry.get(gameId)?.name || gameId}</h2>
          <p>此遊戲已保留擴充位置，尚未加入 Game Engine。</p>
        </section>
      )}
    </main>
  );
}
