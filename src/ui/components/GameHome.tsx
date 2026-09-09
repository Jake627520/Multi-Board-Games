import type { ReactNode } from "react";
import type { GameEngine, GameId } from "../../core/game/types";

interface GameHomeProps {
  /** 直接來自 registry.list()：新棋種 register 進去就自動長出一張卡 */
  readonly games: readonly GameEngine<unknown, unknown>[];
  /** 上次玩的棋種（localStorage 不可用時為 null） */
  readonly lastGameId: GameId | null;
  readonly onSelectGame: (id: GameId) => void;
}

/**
 * 純 CSS 縮圖：不引入任何圖片 / SVG 檔。
 * 未知棋種會落到 fallback 的通用格線縮圖，不影響卡片本身。
 */
function Thumbnail({ gameId }: { readonly gameId: GameId }): ReactNode {
  if (gameId === "xiangqi") {
    return (
      <span className="card-thumb thumb-xiangqi" aria-hidden="true">
        <span className="thumb-palace thumb-palace-top" />
        <span className="thumb-palace thumb-palace-bottom" />
        <span className="thumb-river">楚河　漢界</span>
      </span>
    );
  }
  if (gameId === "gomoku") {
    return (
      <span className="card-thumb thumb-gomoku" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`thumb-star thumb-star-${i}`} />
        ))}
      </span>
    );
  }
  if (gameId === "banqi") {
    return (
      <span className="card-thumb thumb-banqi" aria-hidden="true">
        {Array.from({ length: 32 }, (_, i) => (
          <span key={i} className="thumb-back" />
        ))}
      </span>
    );
  }
  return <span className="card-thumb thumb-generic" aria-hidden="true" />;
}

export function GameHome({ games, lastGameId, onSelectGame }: GameHomeProps) {
  const lastGame = lastGameId
    ? games.find((g) => g.id === lastGameId) ?? null
    : null;

  return (
    <section className="game-home" data-testid="game-home">
      {lastGame && (
        <button
          type="button"
          className="resume-bar"
          data-testid="resume-last-game"
          onClick={() => onSelectGame(lastGame.id)}
        >
          <span className="resume-mark" aria-hidden="true">
            ▶
          </span>
          繼續上次的{lastGame.name}
        </button>
      )}

      <p className="home-lede">
        一個棋盤，三種下法。選一種開始，或接續上一局。
      </p>

      <ul className="game-card-grid">
        {games.map((game) => (
          <li key={game.id}>
            <button
              type="button"
              className={`game-card accent-${game.accent ?? "ink"}`}
              data-testid={`game-card-${game.id}`}
              onClick={() => onSelectGame(game.id)}
            >
              <Thumbnail gameId={game.id} />
              {game.latinName && (
                <span className="latin-name">{game.latinName}</span>
              )}
              <span className="card-name">{game.name}</span>
              {game.description && (
                <span className="card-desc">{game.description}</span>
              )}
              <span className="card-foot">
                {game.boardSize && (
                  <span className="card-size">{game.boardSize}</span>
                )}
                <span className="card-cta">開始對局 →</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
