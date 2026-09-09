import { useEffect, useRef } from "react";
import type { Player } from "../../core/game/types";

export interface FormattedMove {
  readonly player: Player;
  readonly notation: string;
}

export interface MoveHistoryProps {
  readonly moves: FormattedMove[];
  readonly formatPlayer?: (player: Player) => string;
  /** 回放模式下目前高亮的步數（0-based，對應 moves index） */
  readonly activeStep?: number;
  /** 點擊某一步時回呼（用於回放跳轉） */
  readonly onStepClick?: (step: number) => void;
  readonly isReplayMode?: boolean;
}

export function MoveHistory({
  moves,
  formatPlayer = (p) => p,
  activeStep,
  onStepClick,
  isReplayMode = false,
}: MoveHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !isReplayMode) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [moves.length, isReplayMode]);

  return (
    <div className="move-history-container" data-testid="move-history">
      <div className="move-history-header">
        <span>
          對局步譜（{moves.length} 步）
          {isReplayMode ? " · 回放中" : ""}
        </span>
      </div>

      <div className="move-history-list" ref={containerRef}>
        {moves.length === 0 ? (
          <div className="move-history-empty">尚未落子</div>
        ) : (
          moves.map((item, index) => {
            const isActive =
              isReplayMode && activeStep !== undefined
                ? index === activeStep - 1
                : index === moves.length - 1;
            const moveNum = index + 1;
            return (
              <div
                key={index}
                className={`move-item ${isActive ? "latest" : ""} ${
                  isReplayMode ? "clickable" : ""
                }`}
                data-testid={`move-item-${index}`}
                onClick={() => {
                  if (isReplayMode && onStepClick) {
                    onStepClick(index + 1);
                  }
                }}
                onKeyDown={(e) => {
                  if (isReplayMode && onStepClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onStepClick(index + 1);
                  }
                }}
                role={isReplayMode ? "button" : undefined}
                tabIndex={isReplayMode ? 0 : undefined}
                aria-label={
                  isReplayMode
                    ? `第 ${moveNum} 步：${formatPlayer(item.player)} ${item.notation}`
                    : undefined
                }
              >
                <span className="move-index">{moveNum}.</span>
                <span className={`move-badge ${item.player}`}>
                  {formatPlayer(item.player)}
                </span>
                <span className="move-notation">{item.notation}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
