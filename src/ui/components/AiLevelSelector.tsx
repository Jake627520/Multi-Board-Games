export type AiLevel = "l1" | "l2";

export interface AiLevelLabels {
  readonly heading: string;
  readonly l1: string;
  readonly l2: string;
}

/**
 * 三種棋的兩個 AI 都是難度階梯。預設的括號描述（啟發式／Minimax）只適用於
 * 象棋與五子棋；暗棋的 Level 2 是貪婪而非搜尋，所以它傳自己的描述進來
 * （見 BanqiBoard）。
 */
export const DEFAULT_AI_LEVEL_LABELS: AiLevelLabels = {
  heading: "電腦難度：",
  l1: "Level 1 (啟發式)",
  l2: "Level 2 (Minimax)",
};

export interface AiLevelSelectorProps {
  readonly aiLevel: AiLevel;
  readonly onAiLevelChange: (level: AiLevel) => void;
  readonly disabled?: boolean;
  readonly labels?: AiLevelLabels;
}

/**
 * AI 難度切換。括號裡的描述可由各棋盤覆寫，讓它說的是該棋種 AI 實際怎麼下。
 * 三個棋盤原本各自複製一份一模一樣的 mode-tabs，抽到這裡共用；
 * 「切難度後要不要重開局」由各棋盤自行決定，透過 onAiLevelChange 處理。
 */
export function AiLevelSelector({
  aiLevel,
  onAiLevelChange,
  disabled = false,
  labels = DEFAULT_AI_LEVEL_LABELS,
}: AiLevelSelectorProps) {
  return (
    <div className="game-mode-selector" data-testid="ai-level-selector">
      <span className="side-label">{labels.heading}</span>
      <div className="mode-tabs">
        <button
          type="button"
          className={`mode-btn ${aiLevel === "l1" ? "active" : ""}`}
          onClick={() => onAiLevelChange("l1")}
          disabled={disabled}
          data-testid="ai-level-1"
        >
          {labels.l1}
        </button>
        <button
          type="button"
          className={`mode-btn ${aiLevel === "l2" ? "active" : ""}`}
          onClick={() => onAiLevelChange("l2")}
          disabled={disabled}
          data-testid="ai-level-2"
        >
          {labels.l2}
        </button>
      </div>
    </div>
  );
}
