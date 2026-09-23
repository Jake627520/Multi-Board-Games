export type AiLevel = "l1" | "l2";

export interface AiLevelSelectorProps {
  readonly aiLevel: AiLevel;
  readonly onAiLevelChange: (level: AiLevel) => void;
  readonly disabled?: boolean;
}

/**
 * AI 難度切換（Level 1 啟發式 / Level 2 Minimax）。
 * 三個棋盤原本各自複製一份一模一樣的 mode-tabs，抽到這裡共用；
 * 「切難度後要不要重開局」由各棋盤自行決定，透過 onAiLevelChange 處理。
 */
export function AiLevelSelector({
  aiLevel,
  onAiLevelChange,
  disabled = false,
}: AiLevelSelectorProps) {
  return (
    <div className="game-mode-selector" data-testid="ai-level-selector">
      <span className="side-label">電腦難度：</span>
      <div className="mode-tabs">
        <button
          type="button"
          className={`mode-btn ${aiLevel === "l1" ? "active" : ""}`}
          onClick={() => onAiLevelChange("l1")}
          disabled={disabled}
          data-testid="ai-level-1"
        >
          Level 1 (啟發式)
        </button>
        <button
          type="button"
          className={`mode-btn ${aiLevel === "l2" ? "active" : ""}`}
          onClick={() => onAiLevelChange("l2")}
          disabled={disabled}
          data-testid="ai-level-2"
        >
          Level 2 (Minimax)
        </button>
      </div>
    </div>
  );
}
