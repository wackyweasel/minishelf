@echo off
echo Starting MiniShelf Frontend...
echo.
cd /d "%~dp0"
call npm run client:dev
