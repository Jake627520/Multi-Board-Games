@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================
echo   Multi Board Games Platform 一鍵啟動
echo ======================================

if not exist "node_modules" (
  echo 首次執行，正在安裝依賴...
  call npm install
)

echo 正在啟動本地遊戲伺服器...
echo 若瀏覽器未自動開啟，請直接訪問終端機顯示的網址 (通常為 http://localhost:5173)
echo 按下 Ctrl + C 可隨時停止伺服器。
echo ======================================

call npm run dev -- --open
pause
