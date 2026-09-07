# Multi Board Games

可擴充的多棋類遊戲平台，第一個 Game Engine 為中國象棋（Xiangqi）。

## 技術

- React + TypeScript + Vite
- Vitest
- Playwright
- Engine / UI 分離
- Game Registry
- Game Session / History / Undo

## 目前

已完成：
- Multi-game registry
- Generic `GameEngine<State, Move>`
- Generic `GameSession`
- Xiangqi 9x10 board
- 32 pieces
- General / Advisor / Elephant / Horse / Chariot / Cannon / Soldier
- Horse leg
- Elephant eye
- Cannon screen
- River / palace restrictions
- Flying general
- Check detection
- Legal move filtering
- Checkmate / stalemate 基本判定
- Undo / restart
- JSON serialization API

預留：
- 暗棋 Banqi
- 五子棋 Gomoku
- 跳棋 / Chinese Checkers
- Replay
- Save / Load
- AI

## 執行

```bash
npm install
npm run test
npm run build
npm run dev
```

## 架構

```text
src/
├── core/
│   └── game/
│       ├── types.ts
│       ├── registry.ts
│       └── session.ts
├── games/
│   ├── registry.ts
│   └── xiangqi/
│       ├── types.ts
│       ├── board.ts
│       ├── setup.ts
│       ├── rules.ts
│       └── engine.ts
└── ui/
    └── XiangqiBoard.tsx
```

新增遊戲時，不要修改 Xiangqi rules 以適配新遊戲；建立新的 engine 即可。

## License

This project is licensed under the MIT License.

See [LICENSE](./LICENSE).

## Third-Party Software

This project may use third-party software distributed under their respective licenses.

See [docs/THIRD_PARTY_LICENSES.md](./docs/THIRD_PARTY_LICENSES.md).

## Copyright / IP

Source code, third-party dependencies, external assets, game data, fonts, audio, and AI engines may have different licensing requirements.

See [docs/COPYRIGHT_POLICY.md](./docs/COPYRIGHT_POLICY.md).
