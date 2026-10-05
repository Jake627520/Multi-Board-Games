import type { ReactNode } from "react";
import type { GameEngine, GameId } from "../../core/game/types";

interface GameHomeProps {
  /** 直接來自 registry.list()：新棋種 register 進去就自動長出一張卡 */
  readonly games: readonly GameEngine<unknown, unknown>[];
  /** 上次玩的棋種（localStorage 不可用時為 null） */
  readonly lastGameId: GameId | null;
  /**
   * 該棋種是否真的有可續的局（自動存檔存在且走過至少一步）。
   * 只有「上次的棋種」且「真的可續」才顯示「繼續」按鈕——
   * 只看 lastGameId 會讓按鈕成為空頭支票（點進去是全新棋局）。
   */
  readonly canResume: (id: GameId) => boolean;
  readonly onSelectGame: (id: GameId) => void;
  /**
   * 放棄該棋種的存檔、開一局新的。只有「有可續的局」的卡片才會出現這個按鈕。
   * 沒傳就不顯示（卡片仍會標示「繼續」）。
   */
  readonly onNewGame?: (id: GameId) => void;
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

export function GameHome({ games, lastGameId, canResume, onSelectGame, onNewGame }: GameHomeProps) {
  const found = lastGameId
    ? games.find((g) => g.id === lastGameId) ?? null
    : null;
  const lastGame = found && canResume(found.id) ? found : null;

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
          繼續上次的{lastGame.name} <span className="resume-en">/ Resume {lastGame.latinName ?? lastGame.name}</span>
        </button>
      )}

      <p className="home-lede">
        <span>一個棋盤，三種下法。選一種開始，或接續上一局。</span>
        <span className="home-lede-en">
          One board, three games. Choose one to begin, or resume your last match.
        </span>
      </p>

      <ul className="game-card-grid">
        {games.map((game) => {
          // 每張卡各自判斷：點下去會不會續上舊局，要在卡片上講清楚，
          // 不能只有「上次的棋種」才有提示、其他棋種卻無聲續上舊局。
          const resumable = canResume(game.id);
          return (
          <li key={game.id} className={resumable ? "has-resume" : undefined}>
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
                <div className="card-desc">
                  <p className="card-desc-zh">{game.description}</p>
                  {game.descriptionEn && (
                    <p className="card-desc-en">{game.descriptionEn}</p>
                  )}
                </div>
              )}
              <span className="card-foot">
                {game.boardSize && (
                  <span className="card-size">{game.boardSize}</span>
                )}
                {resumable ? (
                  <span className="card-cta" data-testid={`card-cta-resume-${game.id}`}>
                    繼續對局 Resume →
                  </span>
                ) : (
                  <span className="card-cta" data-testid={`card-cta-new-${game.id}`}>
                    開始對局 Play →
                  </span>
                )}
              </span>
            </button>
            {resumable && onNewGame && (
              <button
                type="button"
                className="card-new-game"
                data-testid={`new-game-${game.id}`}
                onClick={() => onNewGame(game.id)}
              >
                放棄存檔，開新局 New game
              </button>
            )}
          </li>
          );
        })}
      </ul>
    </section>
  );
}
