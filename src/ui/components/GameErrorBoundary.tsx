import { Component, type ErrorInfo, type ReactNode } from "react";
import type { GameId } from "../../core/game/types";
import { clearAutosave } from "../../core/persistence/autosave";

interface GameErrorBoundaryProps {
  readonly gameId: GameId;
  /** 棋盤崩潰時通知上層（例如把「對局進行中」旗標歸零，避免對著已崩潰的畫面問離開確認） */
  readonly onError?: (error: Error) => void;
  readonly onGoHome?: () => void;
  readonly children: ReactNode;
}

interface GameErrorBoundaryState {
  readonly error: Error | null;
}

/**
 * 包住棋盤。自動存檔在棋盤掛載時還原——所以若某份存檔會讓棋盤崩潰，
 * 重新整理會再還原同一份、再崩一次，形成白畫面迴圈。
 * 這裡在棋盤崩潰時把該棋種的自動存檔清掉：最壞結果是丟掉一局，而不是整站打不開。
 *
 * 這是對機制的防禦，不是已觀察到的 bug（還原前有完整的棋譜重放驗證，
 * 目前找不到可重現的觸發條件）。只清「該棋種」的自動存檔；手動存檔不動。
 */
export class GameErrorBoundary extends Component<
  GameErrorBoundaryProps,
  GameErrorBoundaryState
> {
  state: GameErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GameErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    clearAutosave(this.props.gameId);
    this.props.onError?.(error);
    console.error(`[GameErrorBoundary] ${this.props.gameId} crashed`, error, info.componentStack);
  }

  private retry = () => {
    // 自動存檔已在 componentDidCatch 清掉，重新掛載 = 全新棋局，不會再還原壞檔
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <section className="placeholder" role="alert" data-testid="game-error-fallback">
        <h2>棋盤發生錯誤</h2>
        <p>
          這個棋種的棋盤崩潰了。為避免重新整理後又載入同一份壞存檔而反覆崩潰，
          已清除這個棋種的自動存檔（手動存檔不受影響）。
        </p>
        <div className="actions">
          <button type="button" onClick={this.retry} data-testid="game-error-retry">
            開新局
          </button>
          {this.props.onGoHome && (
            <button type="button" onClick={this.props.onGoHome} data-testid="game-error-home">
              回首頁
            </button>
          )}
        </div>
      </section>
    );
  }
}
