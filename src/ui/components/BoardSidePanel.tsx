import type { ReactNode } from "react";
import { GameModeSelector, type GameMode } from "./GameModeSelector";
import { AiLevelSelector, type AiLevel } from "./AiLevelSelector";
import { MoveHistory } from "./MoveHistory";
import { ReplayControls } from "./ReplayControls";
import { SaveManagerPanel } from "./SaveManagerPanel";
import type { ReplaySpeed } from "../hooks/useGameSession";
import type { MoveRecord, Player } from "../../core/game/types";
import type { SaveMeta } from "../../core/persistence/local-storage";

/**
 * BoardSidePanel 需要用到的 useGameSession 回傳值子集合（結構型別）。
 * 直接吃整個 session 物件而不是攤平成二十幾個 props，是為了讓新增棋種時
 * 只要 `session={session}` 一行，不必再逐一轉接。
 */
export interface BoardSidePanelSession {
  readonly history: readonly MoveRecord[];
  // Replay
  readonly isReplayMode: boolean;
  readonly replayStep: number;
  readonly replayStepCount: number;
  readonly isPlaying: boolean;
  readonly replaySpeed: ReplaySpeed;
  readonly setReplaySpeed: (speed: ReplaySpeed) => void;
  readonly setIsPlaying: (playing: boolean) => void;
  readonly enterReplay: () => void;
  readonly exitReplay: () => void;
  readonly replayStepTo: (step: number) => void;
  readonly replayNext: () => void;
  readonly replayPrev: () => void;
  // Local Save
  readonly listLocalSaves: () => SaveMeta[];
  readonly saveToLocal: (name?: string) => void;
  readonly loadFromLocal: (id: string) => void;
  readonly deleteLocalSave: (id: string) => void;
  readonly renameLocalSave: (id: string, name: string) => void;
}

export interface BoardSidePanelProps {
  readonly session: BoardSidePanelSession;

  /** 標題區 */
  readonly latinName?: string;
  readonly name: string;
  readonly badge: ReactNode;

  /** 對戰模式與執方 */
  readonly mode: GameMode;
  readonly humanPlayer: Player;
  readonly availablePlayers: { readonly id: Player; readonly label: string }[];
  readonly onModeChange: (mode: GameMode) => void;
  readonly onHumanPlayerChange: (player: Player) => void;

  /** AI 難度（僅 PvE 顯示） */
  readonly aiLevel: AiLevel;
  readonly onAiLevelChange: (level: AiLevel) => void;

  readonly formatPlayer: (player: string) => string;
  readonly disabled?: boolean;

  /** 棋種專屬控制項，排在「復盤按鈕」與「模式選擇器」之間（例：五子棋規則切換） */
  readonly extraControls?: ReactNode;
  /** 棋種專屬資訊，排在控制區與步譜之間（例：暗棋執色說明） */
  readonly beforeHistory?: ReactNode;
  /** 底部的規則說明與圖例 */
  readonly children?: ReactNode;
}

/**
 * 三個棋盤共用的側欄：標題、復盤控制、對戰模式、AI 難度、步譜、本機存檔。
 * 棋種差異一律走 extraControls / beforeHistory / children 三個插槽，
 * 不在這裡開 if (gameId === ...) 分支。
 */
export function BoardSidePanel({
  session,
  latinName,
  name,
  badge,
  mode,
  humanPlayer,
  availablePlayers,
  onModeChange,
  onHumanPlayerChange,
  aiLevel,
  onAiLevelChange,
  formatPlayer,
  disabled = false,
  extraControls,
  beforeHistory,
  children,
}: BoardSidePanelProps) {
  const {
    history,
    isReplayMode,
    replayStep,
    replayStepCount,
    isPlaying,
    replaySpeed,
    setReplaySpeed,
    setIsPlaying,
    enterReplay,
    exitReplay,
    replayStepTo,
    replayNext,
    replayPrev,
    listLocalSaves,
    saveToLocal,
    loadFromLocal,
    deleteLocalSave,
    renameLocalSave,
  } = session;

  return (
    <aside className="side-panel">
      {latinName && (
        <span className="latin-name">{latinName}</span>
      )}
      <h2>{name}</h2>
      <p className="engine-badge">{badge}</p>

      {isReplayMode ? (
        <ReplayControls
          currentStep={replayStep}
          totalSteps={replayStepCount}
          isPlaying={isPlaying}
          speed={replaySpeed}
          onPrev={replayPrev}
          onNext={replayNext}
          onStepTo={replayStepTo}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onSpeedChange={setReplaySpeed}
          onExit={exitReplay}
        />
      ) : (
        <>
          <div className="actions">
            <button
              type="button"
              onClick={() => enterReplay()}
              disabled={history.length === 0}
              data-testid="enter-replay-btn"
            >
              🎬 復盤回放本局
            </button>
          </div>

          {extraControls}

          <GameModeSelector
            mode={mode}
            humanPlayer={humanPlayer}
            availablePlayers={availablePlayers}
            onModeChange={onModeChange}
            onHumanPlayerChange={onHumanPlayerChange}
            disabled={disabled}
          />

          {/* AI 難度選擇 */}
          {mode === "pve" && (
            <AiLevelSelector
              aiLevel={aiLevel}
              onAiLevelChange={onAiLevelChange}
              disabled={disabled}
            />
          )}
        </>
      )}

      {beforeHistory}

      <MoveHistory
        moves={history.map((h) => ({
          player: h.player,
          notation: h.notation ?? "",
        }))}
        formatPlayer={formatPlayer}
        isReplayMode={isReplayMode}
        activeStep={replayStep}
        onStepClick={replayStepTo}
      />

      {!isReplayMode && (
        <SaveManagerPanel
          listSaves={listLocalSaves}
          onSave={saveToLocal}
          onLoad={loadFromLocal}
          onDelete={deleteLocalSave}
          onRename={renameLocalSave}
          disabled={disabled}
        />
      )}

      {children}
    </aside>
  );
}
