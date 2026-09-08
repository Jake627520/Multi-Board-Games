# Design Document: 015-github-ci-and-repo-metadata

## CI Architecture

```text
GitHub Event (push / PR to main)
  │
  ▼
GitHub Runner: ubuntu-latest
  ├── actions/checkout@v4
  ├── actions/setup-node@v4 (Node 20, npm cache)
  ├── npm ci
  ├── npm test (vitest run: 40 files / 163 tests)
  ├── npx tsc --noEmit (TypeScript static type check)
  └── npm run build (vite build: client bundling)
```

## Repository Metadata Specification

- **Repository Description**:
  `Multi board-game platform (Xiangqi / Gomoku / Banqi) with decoupled engines, local save/replay, and zero binary assets.`
- **Repository Topics**:
  `xiangqi`, `gomoku`, `banqi`, `board-game`, `typescript`, `react`, `vite`, `open-source`
- **CI Badge**:
  `[![CI](https://github.com/Jake627520/Multi-Board-Games/actions/workflows/ci.yml/badge.svg)](https://github.com/Jake627520/Multi-Board-Games/actions/workflows/ci.yml)`
