#!/bin/bash
set -e

# 切換到腳本所在目錄
cd "$(dirname "$0")"

echo "======================================"
echo "  Multi Board Games Platform 一鍵啟動"
echo "======================================"

# 檢查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
  echo "首次執行，正在安裝依賴..."
  npm install
fi

echo "正在啟動本地遊戲伺服器..."
echo "若瀏覽器未自動開啟，請直接訪問終端機顯示的網址 (通常為 http://localhost:5173)"
echo "按下 Ctrl + C 可隨時停止伺服器。"
echo "======================================"

npm run dev -- --open
