# Multi Board Games Platform（多棋類遊戲平台）

可擴充的多棋類遊戲平台，嚴格遵循三層解耦架構（UI 層、Core Session 層、Game Engine 規則層）。

目前支援：
- **中國象棋 (Xiangqi)**：完整傳統規則（含將軍、困斃、長將判負、三次重複和棋、自然限招等）
- **五子棋 (Gomoku)**：$15 \times 15$ Free-style 規則（四軸 $O(1)$ 快速勝負判定）
- **對戰模式**：本地雙人輪流（PvP）與單人對電腦（PvE，可自選先後手）
- **本地 AI 框架**：純前端啟發式 AI，不依賴後端或外部網路
- **標準記譜系統**：象棋傳統中文記譜（如「炮二平五」「馬8進7」「前車進一」）與五子棋代數座標記譜（如「H8」）

---

## 快速一鍵啟動

### macOS / Linux
直接執行一鍵腳本（自動檢查安裝依賴並開啟瀏覽器）：
```bash
./start-game.sh
```

### Windows
雙擊根目錄下的 `start-game.bat`，或在命令提示字元中執行：
```bat
start-game.bat
```

### 手動啟動
```bash
npm install
npm run dev
```

---

## 驗證與測試

本專案遵循嚴格的 TDD 與規格導向開發，所有核心規則與 AI 演算法皆有完整單元測試：

```bash
# 執行完整單元與整合測試（27 測試檔案、95 個測試）
npm run test

# 執行 TypeScript 型別檢查
npx tsc --noEmit

# 建置生產環境 Bundle
npm run build
```

---

## 架構說明

```text
src/
├── core/
│   ├── ai/            # 通用 AI 介面 (AiPlayer)
│   └── game/          # 通用核心型別、GameSession、GameRegistry
├── games/
│   ├── gomoku/        # 五子棋引擎、規則、Level 1 AI、座標記譜
│   ├── xiangqi/       # 象棋引擎、規則、Level 1 AI、中文記譜
│   └── registry.ts    # 遊戲註冊中心
└── ui/
    ├── components/    # 棋盤、StatusBar、GameModeSelector、MoveHistory
    └── hooks/         # useGameSession (管理走步、AI 延遲落子、悔棋)
```

---

## License & IP

- **License**: MIT License (見 [LICENSE](LICENSE))
- **Third-Party Licenses**: [docs/THIRD_PARTY_LICENSES.md](docs/THIRD_PARTY_LICENSES.md)
- **Copyright Policy**: [docs/COPYRIGHT_POLICY.md](docs/COPYRIGHT_POLICY.md)
