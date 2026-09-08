import type { ReplaySpeed } from "../hooks/useGameSession";

export interface ReplayControlsProps {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly isPlaying: boolean;
  readonly speed: ReplaySpeed;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onStepTo: (step: number) => void;
  readonly onTogglePlay: () => void;
  readonly onSpeedChange: (speed: ReplaySpeed) => void;
  readonly onExit: () => void;
}

const SPEEDS: { value: ReplaySpeed; label: string }[] = [
  { value: 1200, label: "慢 (1.2s)" },
  { value: 800, label: "正常 (0.8s)" },
  { value: 400, label: "快 (0.4s)" },
];

export function ReplayControls({
  currentStep,
  totalSteps,
  isPlaying,
  speed,
  onPrev,
  onNext,
  onStepTo,
  onTogglePlay,
  onSpeedChange,
  onExit,
}: ReplayControlsProps) {
  return (
    <div className="replay-controls" data-testid="replay-controls">
      <div className="replay-toolbar">
        <button
          type="button"
          onClick={() => onStepTo(0)}
          title="跳至開頭"
          data-testid="replay-first"
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={currentStep <= 0}
          title="上一著"
          data-testid="replay-prev"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          title={isPlaying ? "暫停" : "播放"}
          data-testid="replay-play-toggle"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={currentStep >= totalSteps}
          title="下一著"
          data-testid="replay-next"
        >
          ▶
        </button>
        <button
          type="button"
          onClick={() => onStepTo(totalSteps)}
          title="跳至結尾"
          data-testid="replay-last"
        >
          ⏭
        </button>

        <span className="replay-step-label" data-testid="replay-step-label">
          {currentStep} / {totalSteps} 步
        </span>

        <div className="replay-speed">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={speed === s.value ? "active" : ""}
              onClick={() => onSpeedChange(s.value)}
              data-testid={`replay-speed-${s.value}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="replay-exit"
          onClick={onExit}
          data-testid="replay-exit"
        >
          結束回放
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={totalSteps}
        value={currentStep}
        onChange={(e) => onStepTo(Number(e.target.value))}
        className="replay-slider"
        aria-label="回放進度"
        data-testid="replay-slider"
      />
    </div>
  );
}
