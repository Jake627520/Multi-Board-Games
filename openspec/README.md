# OpenSpec Living Specifications & Change Lifecycle

This directory contains the authoritative living specifications and change proposals for the Multi Board Games Platform.

## Architecture Boundaries

The platform strictly adheres to three decoupled layers:

1. **UI Layer (`src/ui/`)**: Pure rendering, user interaction, sound, animation. Never calculates game rules or legal moves.
2. **Game Session (`src/core/game/session.ts`)**: Generic session orchestrator managing move lifecycle, history, undo/redo stack, and serialization.
3. **Game Engine (`src/games/<game>/`)**: Independent, stateless rule engines implementing `GameEngine<State, Move>`.

```text
┌─────────────────────────────┐
│           UI Layer          │
│ src/ui/                     │
│ React / rendering / input   │
└──────────────┬──────────────┘
               │ Move
               ▼
┌─────────────────────────────┐
│        Game Session         │
│ src/core/game/session.ts    │
│ history / undo / lifecycle  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        Game Engine          │
│ src/games/<game>/           │
│ rules / state / moves       │
└─────────────────────────────┘
```

## Directory Structure

```text
openspec/
├── README.md
├── specs/                          # Permanent Living Specifications (Source of Truth)
│   ├── game-platform/spec.md       # Platform abstractions, GameEngine protocol, Registry
│   ├── game-session/spec.md        # Session lifecycle, move validation, history, undo, reset
│   ├── licensing/spec.md           # Open-source license and IP boundary specification
│   ├── gomoku/spec.md              # Gomoku (五子棋) board, rules, and win conditions
│   └── xiangqi/
│       ├── board/spec.md           # 9x10 grid, coordinates, river, palaces
│       ├── pieces/spec.md          # 7 piece types, 32 pieces, setup, colors
│       ├── movement/spec.md        # Movement constraints (horse leg, elephant eye, cannon screen)
│       ├── king-safety/spec.md     # Check, flying general, self-check rejection
│       └── game-end/spec.md        # Checkmate, stalemate, winner determination
└── changes/                        # Change Proposals and TDD Execution Packages
    ├── 001-create-multi-game-platform/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 002-add-xiangqi-engine/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 003-add-open-source-license/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 004-core-genericity-and-xiangqi-rules/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 005-add-gomoku-engine/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 006-ui-multi-game-platform/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 007-ai-framework/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 008-move-notation/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 009-add-banqi-engine/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 010-banqi-rules-audit/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 011-generic-player-view/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   └── tasks.md
    ├── 012-save-load-replay/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── specs/
    │   │   ├── save-load/
    │   │   ├── replay/
    │   │   └── serialization-policy/
    │   └── tasks.md
    ├── 013-gomoku-enhancement/
    │   ├── proposal.md
    │   ├── design.md
    │   └── tasks.md
    ├── 014-replay-ui-and-save-manager/
    │   ├── proposal.md
    │   ├── design.md
    │   └── tasks.md
    └── 015-github-ci-and-repo-metadata/
        ├── proposal.md
        ├── design.md
        └── tasks.md
```

## Spec Governance & TDD Workflow

Every new capability or rule modification follows strict TDD discipline:
1. **Spec First**: Define observable behavior in Given/When/Then scenarios.
2. **RED**: Write failing unit tests in `tests/`.
3. **GREEN**: Implement minimal code to satisfy tests.
4. **REFACTOR**: Improve design while keeping tests green.
5. **AUDIT**: Verify zero architecture leaks across layer boundaries.
