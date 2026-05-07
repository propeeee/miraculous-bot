@echo off
title Miraculous Bot
color 0D
echo.
echo  ✨ Starting Miraculous Guardian Bot...
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌ Node.js is not installed!
    echo  Please install Node.js from https://nodejs.org
    pause
    exit /b
)

if not exist "node_modules" (
    echo  📦 Installing dependencies...
    npm install
    echo.
)

echo  🤖 Bot is running! Press Ctrl+C to stop.
echo.
node bot.js
pause
