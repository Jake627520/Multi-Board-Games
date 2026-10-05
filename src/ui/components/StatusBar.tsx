import type { Player } from "../../core/game/types";

interface StatusBarProps {
  readonly currentPlayer: Player;
  readonly isGameOver: boolean;
  readonly winner: Player | null;
  readonly isDraw?: boolean;
  readonly inCheck?: boolean;
  readonly error?: string;
  readonly isAiThinking?: boolean;
  /** 復盤中：悔棋與重新開始都會毀掉實際對局（或靜默無效），一律停用並說明原因 */
  readonly isReplayMode?: boolean;
  readonly onUndo: () => void;
  readonly onReset: () => void;
  readonly formatPlayer?: (player: Player) => string;
}

const defaultFormatPlayer = (p: Player) => {
  if (p === "red") return "紅方";
  if (p === "black") return "黑方";
  if (p === "white") return "白方";
  return p;
};

export function StatusBar({
  currentPlayer,
  isGameOver,
  winner,
  isDraw,
  inCheck,
  error,
  isAiThinking,
  isReplayMode = false,
  onUndo,
  onReset,
  formatPlayer = defaultFormatPlayer,
}: StatusBarProps) {
  return (
    <div className="status-bar-container">
      <div className="status-row" role="status" aria-live="polite">
        {!isGameOver && (
          <span>
            輪到：<strong>{formatPlayer(currentPlayer)}</strong>
            {isAiThinking && <span className="ai-thinking">（電腦思考中...）</span>}
          </span>
        )}
        {inCheck && !isGameOver && <span className="check">將軍！</span>}
        {isGameOver && winner && (
          <span className="gameover winner">
            🎉 {formatPlayer(winner)} 獲勝！
          </span>
        )}
        {isGameOver && isDraw && (
          <span className="gameover draw">🤝 雙方和局</span>
        )}
      </div>

      <div className="actions">
        <button
          onClick={onUndo}
          disabled={isAiThinking || isReplayMode}
          aria-label="悔棋"
          title={isReplayMode ? "復盤中無法悔棋，請先離開復盤" : undefined}
        >
          悔棋
        </button>
        <button
          onClick={onReset}
          disabled={isAiThinking || isReplayMode}
          aria-label="重新開始"
          title={isReplayMode ? "復盤中無法重新開始，請先離開復盤" : undefined}
        >
          重新開始
        </button>
      </div>

      {isReplayMode && (
        <div className="muted" data-testid="replay-actions-hint">
          復盤中：悔棋與重新開始已停用，離開復盤後才能操作。
        </div>
      )}

      {error && (
        <div className="error" role="alert" aria-live="assertive">
          {error}
        </div>
      )}
    </div>
  );
}
