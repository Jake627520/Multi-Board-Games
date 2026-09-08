import type { GameEngine, GameId } from "../../core/game/types";

interface GameSwitcherProps {
  readonly currentGameId: GameId;
  readonly availableGames: readonly GameEngine<unknown, unknown>[];
  readonly onSelectGame: (id: GameId) => void;
}

export function GameSwitcher({
  currentGameId,
  availableGames,
  onSelectGame,
}: GameSwitcherProps) {
  return (
    <div className="game-switcher">
      <label htmlFor="game-select" className="visually-hidden">
        選擇遊戲
      </label>
      <select
        id="game-select"
        data-testid="game-switcher-select"
        value={currentGameId}
        onChange={(e) => onSelectGame(e.target.value)}
        aria-label="選擇棋類遊戲"
      >
        {availableGames.map((game) => (
          <option key={game.id} value={game.id}>
            {game.name}
          </option>
        ))}
      </select>
    </div>
  );
}
