import type { Player } from "../../core/game/types";

export type GameMode = "pvp" | "pve";

export interface GameModeSelectorProps {
  readonly mode: GameMode;
  readonly humanPlayer: Player;
  readonly availablePlayers: { readonly id: Player; readonly label: string }[];
  readonly onModeChange: (mode: GameMode) => void;
  readonly onHumanPlayerChange: (player: Player) => void;
  readonly disabled?: boolean;
}

export function GameModeSelector({
  mode,
  humanPlayer,
  availablePlayers,
  onModeChange,
  onHumanPlayerChange,
  disabled = false,
}: GameModeSelectorProps) {
  return (
    <div className="game-mode-selector" data-testid="game-mode-selector">
      <div className="mode-tabs">
        <button
          type="button"
          className={`mode-btn ${mode === "pvp" ? "active" : ""}`}
          onClick={() => onModeChange("pvp")}
          disabled={disabled}
          data-testid="mode-pvp"
        >
          👥 雙人對戰 (PvP)
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === "pve" ? "active" : ""}`}
          onClick={() => onModeChange("pve")}
          disabled={disabled}
          data-testid="mode-pve"
        >
          🤖 對戰電腦 (PvE)
        </button>
      </div>

      {mode === "pve" && (
        <div className="side-selector" data-testid="side-selector">
          <span className="side-label">玩家執方：</span>
          <div className="side-buttons">
            {availablePlayers.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`side-btn ${humanPlayer === p.id ? "active" : ""}`}
                onClick={() => onHumanPlayerChange(p.id)}
                disabled={disabled}
                data-testid={`side-${p.id}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
