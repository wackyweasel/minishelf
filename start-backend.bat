@echo off
echo Starting MiniShelf Backend Server...
echo.
cd /d "%~dp0"
call npm run server:dev
