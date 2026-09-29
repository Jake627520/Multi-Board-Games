# Multi Board Games Platform（多棋類遊戲平台）

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/Jake627520/Multi-Board-Games/actions/workflows/ci.yml/badge.svg)](https://github.com/Jake627520/Multi-Board-Games/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success.svg)](https://jake627520.github.io/Multi-Board-Games/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-vitest-brightgreen.svg)](tests/)
[![Version](https://img.shields.io/badge/Version-0.6.0-orange.svg)](package.json)

**[繁體中文](#繁體中文) | [简体中文](#简体中文) | [English](#english)**

---

## 繁體中文

高可擴充的多棋類抽象對弈平台，嚴格遵循三層解耦架構（UI 層、Core Session / Persistence 層、Game Engine 規則層）。全專案**零外部二進位素材**、**零傳染性依賴**，以規格導向（OpenSpec）與測試驅動（TDD）打造。

---

### 🌐 線上遊玩（Live Demo）

可以直接在瀏覽器線上遊玩本平台（GitHub Pages 自動部署）：
👉 **[https://jake627520.github.io/Multi-Board-Games/](https://jake627520.github.io/Multi-Board-Games/)**

---

### 🎮 目前支援棋種與功能

- **中國象棋 (Xiangqi)**：完整傳統規則（含將軍、困斃、長將判負、三次重複和棋、自然限招等）與中文傳統記譜，PvE 支援 Level 1（單層啟發式）與 Level 2（2-ply Minimax + Alpha-Beta 剪枝 + 走法排序）AI 切換。
- **五子棋 (Gomoku)**：$15 \times 15$ 棋盤，支援自由規則 (Freestyle) 與黑方禁手規則（三三、四四、長連禁手，成五優先；白方無禁手），具備精確五連金光高亮與 Level 2 Minimax（含鄰近剪枝與 Alpha-Beta 搜尋）AI。
- **半盤暗棋 (Banqi)**：$4 \times 8$ 隨機洗牌佈局，首翻決定執色、階級相剋、兵吃將、炮跳吃，具備完整的非完全資訊隱藏機制，PvE 支援 Level 1（啟發式）與 Level 2（2-ply Minimax + Alpha-Beta 剪枝）AI 切換。
- **雙人與電腦對戰**：支援本地雙人輪流（PvP）與單人對電腦（PvE，可自選先後手與難度，具備即時思考延遲）。
- **通用視角解耦 (Generic Player View)**：核心層實質分離權威全狀態（Authoritative Full State）與安全視角（ViewState），暗棋未翻開狀態在記憶體與網路層皆不洩露兵種與陣營。
- **版本化存檔與管理 (Save Manager)**：
  - 支援信賴本機存檔（GameSaveEnvelope v1）與原子化校驗回滾。
  - 提供本機存檔管理面板：一鍵儲存（自訂名稱）、載入、重新命名、刪除與容量保護（每遊戲上限 20 筆）。
- **視覺化復盤回放 (Replay Controls)**：
  - 支援步譜單步前進/後退、進度滑桿拖曳跳轉、步譜項目點選跳轉。
  - 支援自動播放與 3 檔播放速度切換（慢 1.2s / 正常 0.8s / 快 0.4s），回放期間 AI 與操作安全互斥。
- **古典水墨視覺體系**：宣紙暖調底色、朱砂與水墨對比、雙層圓章象棋子與行楷楚河漢界；字體採用開源 Web 字型（Ma Shan Zheng / Noto Serif TC / Noto Sans TC，皆 OFL-1.1），無任何打包二進位素材。

---

### 🚀 快速一鍵啟動

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

### 🧪 驗證與自動化測試

本專案遵循嚴格的 TDD 與品質防線，全專案無任何警告或跳過測試：

```bash
# 執行全量單元與整合測試
npm run test

# 執行 TypeScript 靜態型別嚴格檢查
npx tsc --noEmit

# 驗證生產環境打包建置
npm run build
```

---

### 🏛️ 系統架構圖

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
│   ├── gomoku/        # 五子棋引擎、規則、Level 1/2 AI、座標記譜
│   ├── xiangqi/       # 象棋引擎、規則、Level 1/2 AI、中文記譜
│   ├── shared/        # 跨棋種共用：FEN 式盤面編碼、棋子代碼、緊湊欄位、局面雜湊
│   └── registry.ts    # 遊戲註冊中心
└── ui/
    ├── XiangqiBoard.tsx   # 象棋盤（其餘棋盤在 components/）
    ├── components/    # 棋盤與側欄組件 (GomokuBoard, BanqiBoard, GameHome, BoardSidePanel…)
    └── hooks/         # useGameSession、useCoarsePointer、useTapConfirmPlacement
```

---

### License & IP（授權與合規聲明）

- **專案授權**：[MIT License](LICENSE) (c) 2026 Jake627520
- **法律告示**：[NOTICE.md](NOTICE.md)（傳統棋類規則屬公有領域，本專案聲明零二進位素材）
- **第三方套件依賴**：[docs/THIRD_PARTY_LICENSES.md](docs/THIRD_PARTY_LICENSES.md)（直接依賴全數為 MIT / Apache-2.0；間接依賴皆為寬鬆授權：MIT / MIT-0 / ISC / BSD / Apache-2.0，另有一筆僅開發期使用的 CC-BY-4.0 相容性資料集）
- **智慧財產政策**：[docs/COPYRIGHT_POLICY.md](docs/COPYRIGHT_POLICY.md)

---

## 简体中文

基于 TypeScript 构建的多棋类对弈平台，严格遵循三层解耦架构（UI 层、Core Session / Persistence 层、Game Engine 规则层）。全项目零外部二进制素材、零传染性开源依赖，以规格导向（OpenSpec）与测试驱动（TDD）开发。

### 🌐 在线试玩（Live Demo）

可通过浏览器直接在线游玩（GitHub Pages 自动部署）：  
👉 **[https://jake627520.github.io/Multi-Board-Games/](https://jake627520.github.io/Multi-Board-Games/)**

### 🎮 支持棋种与功能

- **中国象棋 (Xiangqi)**：完整传统规则（含将军、困毙、长将判负、三次重复和棋、自然限招等）与标准中文记谱；PvE 支持 Level 1（启发式）与 Level 2（2-ply Minimax + Alpha-Beta 剪枝 + 走法排序）AI。
- **五子棋 (Gomoku)**：$15 \times 15$ 棋盘，支持无禁手自由规则 (Freestyle) 与黑方禁手规则（三三、四四、长连禁手，成五优先；白方无禁手），具备获胜五连高亮与 Level 2 Minimax（邻域搜索剪枝 + Alpha-Beta）AI。
- **半盘暗棋 (Banqi)**：$4 \times 8$ 随机洗牌布局，首翻定色、阶级相克、兵吃将、炮跳吃，具备严格的不完全信息隐藏机制；PvE 支持 Level 1 与 Level 2 AI。
- **对战模式**：支持本地双人轮流（PvP）与人机对战（PvE，支持先后手、难度选择及思考延迟模拟）。
- **通用视角隔离 (Generic Player View)**：核心层解耦权威全状态（Full State）与玩家安全视角（ViewState），暗棋未翻开棋子在内存与序列化层均不泄露兵种与阵营。
- **版本化存档管理 (Save Manager)**：
  - 本地安全存档（GameSaveEnvelope v1）与校验机制。
  - 存档管理面板：支持保存、读取、重命名、删除与容量保护（单游戏上限 20 条）。
- **复盘回放控制 (Replay Controls)**：
  - 支持单步前进/后退、进度条拖拽跳转、历史步谱项点击跳转。
  - 支持自动播放与 3 档调速（0.4s / 0.8s / 1.2s），回放期间锁定走子操作与 AI 计算。
- **水墨视觉风格**：宣纸底色、朱砂与水墨对标、双层圆印棋子，字体均使用开源 Web 字体（OFL-1.1），无任何打包二进制图片资源。

### 🚀 快速启动

#### macOS / Linux
运行一键启动脚本（自动检查依赖并启动）：
```bash
./start-game.sh
```

#### Windows
双击根目录下的 `start-game.bat`，或在命令行运行：
```bat
start-game.bat
```

#### 手动运行
```bash
npm install
npm run dev
```
本地访问：`http://localhost:5173`。

### 🧪 测试与验证

```bash
# 运行单元与集成测试
npm run test

# 静态类型检查
npx tsc --noEmit

# 生产环境打包构建
npm run build
```

### 📄 许可与合规

- **项目许可**：[MIT License](LICENSE) © 2026 Jake627520
- **法律告示**：[NOTICE.md](NOTICE.md)（传统棋类规则属公有领域，本项目声明零二进制素材）
- **第三方依赖**：[docs/THIRD_PARTY_LICENSES.md](docs/THIRD_PARTY_LICENSES.md)（直接依赖全部为 MIT / Apache-2.0；间接依赖均为宽松许可：MIT / MIT-0 / ISC / BSD / Apache-2.0，另有一项仅开发期使用的 CC-BY-4.0 兼容性数据集）
- **知识产权政策**：[docs/COPYRIGHT_POLICY.md](docs/COPYRIGHT_POLICY.md)

---

## English

A decoupled, extensible board game platform written in TypeScript, strictly adhering to a three-tier architecture (UI layer, Core Session / Persistence layer, and Game Engine rule layer). Zero external binary assets, zero restrictive dependencies, built with OpenSpec and Test-Driven Development (TDD).

### 🌐 Live Demo

Play directly in your browser (deployed via GitHub Pages):  
👉 **[https://jake627520.github.io/Multi-Board-Games/](https://jake627520.github.io/Multi-Board-Games/)**

### 🎮 Supported Games & Features

- **Xiangqi (Chinese Chess)**: Full traditional rules (check, checkmate, stalemate, perpetual check restrictions, threefold repetition, move counters) and Chinese algebraic notation. PvE supports Level 1 (heuristic) and Level 2 (2-ply Minimax + Alpha-Beta pruning + move ordering) AI.
- **Gomoku**: $15 \times 15$ board. Supports Freestyle rules and Renju-style Black forbidden moves (double-three, double-four, overline; five-in-a-row takes precedence; no restrictions for White). Features winning five-in-a-row highlights and Level 2 Minimax AI with proximity pruning.
- **Banqi (Half Chess)**: $4 \times 8$ randomized initial layout. First reveal determines player color, strict piece hierarchy (soldiers capture generals), and cannon jump-captures. Built-in hidden-information security model. PvE supports Level 1 and Level 2 AI.
- **Game Modes**: Local 2-Player pass-and-play (PvP) and vs Computer (PvE) with side selection, difficulty settings, and simulated thinking delay.
- **View State Decoupling**: Structural separation between authoritative `FullState` and sanitized `ViewState`. Unrevealed Banqi pieces reveal neither identity nor side in memory or serialization payloads.
- **Save Manager**:
  - Local persistence (`GameSaveEnvelope v1`) with payload validation.
  - In-game save management: save, load, rename, delete, and slot capping (20 saves per game).
- **Replay Controls**:
  - Step forward/backward, scrubber seeking, and move-list click-to-jump.
  - Auto-play with 3-speed toggle (0.4s / 0.8s / 1.2s), with player input and AI execution locked during review.
- **Theme & Assets**: Ink-and-wash aesthetic using pure CSS/SVG and open-source web fonts (OFL-1.1). Zero bundled binary image assets.

### 🚀 Quick Start

#### macOS / Linux
Run the startup script:
```bash
./start-game.sh
```

#### Windows
Run `start-game.bat` or execute in terminal:
```bat
start-game.bat
```

#### Manual Start
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 🧪 Verification & Tests

```bash
# Run unit and integration tests
npm run test

# Run TypeScript type check
npx tsc --noEmit

# Production build
npm run build
```

---

### 📄 License & Compliance

- **Project License**: [MIT License](LICENSE) © 2026 Jake627520
- **Legal Notice**: [NOTICE.md](NOTICE.md) (Traditional board game rules in public domain; zero bundled binary assets)
- **Third-Party Dependencies**: [docs/THIRD_PARTY_LICENSES.md](docs/THIRD_PARTY_LICENSES.md) (Direct dependencies MIT / Apache-2.0; indirect dependencies MIT / MIT-0 / ISC / BSD / Apache-2.0, plus one development-only CC-BY-4.0 browser-compatibility dataset)
- **Copyright Policy**: [docs/COPYRIGHT_POLICY.md](docs/COPYRIGHT_POLICY.md)

