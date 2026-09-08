# Multi Board Games Platform（多棋類遊戲平台）

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-35%20files%20%7C%20140%20passed-brightgreen.svg)](tests/)
[![Version](https://img.shields.io/badge/Version-0.2.0-orange.svg)](package.json)

高可擴充的多棋類抽象對弈平台，嚴格遵循三層解耦架構（UI 層、Core Session / Persistence 層、Game Engine 規則層）。全專案**零外部二進位素材**、**零傳染性依賴**，以規格導向（OpenSpec）與測試驅動（TDD）打造。

---

## 🎮 目前支援棋種與功能

- **中國象棋 (Xiangqi)**：完整傳統規則（含將軍、困斃、長將判負、三次重複和棋、自然限招等）與中文傳統記譜。
- **五子棋 (Gomoku)**：$15 \times 15$ Free-style 棋盤，四軸 $O(1)$ 快速連續五子勝負判定與代數座標記譜。
- **半盤暗棋 (Banqi)**：$4 \times 8$ 隨機洗牌佈局，首翻決定執色、階級相剋、兵吃將、炮跳吃，具備完整的非完全資訊隱藏機制。
- **雙人與電腦對戰**：支援本地雙人輪流（PvP）與單人對電腦（PvE，可自選先後手，具備即時思考延遲）。
- **通用視角解耦 (Generic Player View)**：核心層實質分離權威全狀態（Authoritative Full State）與安全視角（ViewState），暗棋未翻開狀態在記憶體與網路層皆不洩露兵種與陣營。
- **版本化存檔與回放 (Save / Load / Replay)**：
  - 支援信賴本機存檔（GameSaveEnvelope v1）與原子化校驗回滾。
  - 支援動作導向重播（GameReplayEnvelope v1）與逐步時光回溯，公開回放嚴格脫敏。
- **純代碼渲染**：全棋盤與棋子皆以純 CSS 形狀與系統 Unicode 字元（`將`、`帥`、`卒`、`兵`、`🀄`）即時繪製，無外部圖片或字型依賴。

---

## 🚀 快速一鍵啟動

### macOS / Linux
執行一鍵啟動腳本（自動檢查安裝依賴並啟動）：
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

瀏覽器訪問：`http://localhost:5173` 即可遊玩。

---

## 🧪 驗證與自動化測試

本專案遵循嚴格的 TDD 與品質防線，全專案無任何警告或跳過測試：

```bash
# 執行全量單元與整合測試（35 個測試檔案、140 個測試）
npm run test

# 執行 TypeScript 靜態型別嚴格檢查
npx tsc --noEmit

# 驗證生產環境打包建置
npm run build
```

---

## 🏛️ 系統架構圖

```text
                    Game Platform
                         │
              ┌──────────┴──────────┐
              │                     │
         Full State              View State
              │                     │
        Trusted Boundary       Public Boundary
              │                     │
       ┌──────┼──────┐        ┌─────┼──────┐
       │      │      │        │     │      │
      Save   Undo  Trusted   UI  Export  Public
                    Replay              Replay
```

### 原始碼目錄結構

```text
src/
├── core/
│   ├── ai/            # 通用 AI 抽象介面 (AiPlayer)
│   ├── game/          # 通用核心型別 (GameEngine)、GameSession、GameRegistry
│   └── persistence/   # SaveManager、ReplayManager、Serialization Policy
├── games/
│   ├── banqi/         # 暗棋引擎、規則、視角投影 (projectBanqiView)
│   ├── gomoku/        # 五子棋引擎、規則、Level 1 AI、座標記譜
│   ├── xiangqi/       # 象棋引擎、規則、Level 1 AI、中文記譜
│   └── registry.ts    # 遊戲註冊中心
└── ui/
    ├── components/    # 棋盤組件 (XiangqiBoard, GomokuBoard, BanqiBoard, GameSwitcher)
    └── hooks/         # useGameSession (統一走步、視角投影、存檔與重播介面)
```

---

## License & IP（授權與合規聲明）

- **專案授權**：[MIT License](LICENSE) (c) 2026 Jake627520
- **法律告示**：[NOTICE.md](NOTICE.md)（傳統棋類規則屬公有領域，本專案聲明零二進位素材）
- **第三方套件依賴**：[docs/THIRD_PARTY_LICENSES.md](docs/THIRD_PARTY_LICENSES.md)（全數為 MIT / Apache-2.0）
- **智慧財產政策**：[docs/COPYRIGHT_POLICY.md](docs/COPYRIGHT_POLICY.md)
