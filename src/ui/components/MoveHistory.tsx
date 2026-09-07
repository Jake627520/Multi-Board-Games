import { useEffect, useRef } from "react";
import type { Player } from "../../core/game/types";

export interface FormattedMove {
  readonly player: Player;
  readonly notation: string;
}

export interface MoveHistoryProps {
  readonly moves: FormattedMove[];
  readonly formatPlayer?: (player: Player) => string;
}

export function MoveHistory({
  moves,
  formatPlayer = (p) => p,
}: MoveHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [moves.length]);

  return (
    <div className="move-history-container" data-testid="move-history">
      <div className="move-history-header">
        <span>對局步譜（{moves.length} 步）</span>
      </div>

      <div className="move-history-list" ref={containerRef}>
        {moves.length === 0 ? (
          <div className="move-history-empty">尚未落子</div>
        ) : (
          moves.map((item, index) => {
            const isLatest = index === moves.length - 1;
            const moveNum = index + 1;
            return (
              <div
                key={index}
                className={`move-item ${isLatest ? "latest" : ""}`}
                data-testid={`move-item-${index}`}
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
