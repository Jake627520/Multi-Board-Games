# Change Proposal: 015-github-ci-and-repo-metadata

## 1. Why

隨著前 14 輪的快速疊代，Multi Board Games Platform 已建立起完備的三層解耦架構、三大傳統棋種（象棋、五子棋、半盤暗棋）、難度 AI、本機存檔與復盤回放能力，並累積了 40 個測試檔案與 163 個全自動化測試。

為了將本專案的「高標準軟體工程紀律」向開源社群完整揭示，必須建立標準化的持續整合（CI）防線與健全的倉庫元資料（Repository Metadata），確保：
1. 每次提交或 Pull Request 皆在雲端乾淨環境自動驗證測試通過與打包無誤。
2. 讓外界開源開發者透過 GitHub 標籤（Topics）、簡介（Description）與即時 CI 狀態徽章（Badge）清楚了解專案定位與品質狀態。

## 2. Goal

- 建立 GitHub Actions 自動化 CI 工作流（`.github/workflows/ci.yml`）：
  - 在 `main` 分支的 `push` 與 `pull_request` 時自動觸發。
  - 運行於 `ubuntu-latest`，Node 20 環境。
  - 自動執行 `npm ci`、`npm test`、`npx tsc --noEmit`、`npm run build`。
- 在 `README.md` 頂部加入 GitHub Actions CI 狀態徽章。
- 提供標準化倉庫 Description 與 Topics 標籤清單。
- 登錄 OpenSpec 變更生命週期（proposal / design / tasks）。

## 3. Non-Goals

- 發布至 npm registry 或 GitHub Packages（平台定位為獨立 Web 應用，非可安裝套件）。
- 部署至 GitHub Pages 或外部伺服器（保持本機輕量即時啟動）。
- 修改任何遊戲引擎、規則或 UI 邏輯。
