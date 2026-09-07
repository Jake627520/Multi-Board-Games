import type { Player } from "../../core/game/types";

interface StatusBarProps {
  readonly currentPlayer: Player;
  readonly isGameOver: boolean;
  readonly winner: Player | null;
  readonly isDraw?: boolean;
  readonly inCheck?: boolean;
  readonly error?: string;
  readonly isAiThinking?: boolean;
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
  onUndo,
  onReset,
  formatPlayer = defaultFormatPlayer,
}: StatusBarProps) {
  return (
    <div className="status-bar-container">
      <div className="status-row">
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
        <button onClick={onUndo} aria-label="悔棋">
          悔棋
        </button>
        <button onClick={onReset} aria-label="重新開始">
          重新開始
        </button>
      </div>

      {error && <div className="error">{error}</div>}
    </div>
  );
}
