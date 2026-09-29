@echo off
title VYRE OTT Platform Launcher
cd /d "%~dp0"

echo ===================================================
echo     STARTING VYRE PREMIUM OTT PLATFORM...
echo ===================================================

netstat -ano | findstr :3001 >nul
if %errorlevel% equ 0 (
    echo Server is already running on port 3001!
) else (
    echo Launching VYRE Server on http://localhost:3001...
    start /min "VYRE Server" node server/index.js
    timeout /t 2 /nobreak >nul
)

echo Opening VYRE in default browser...
start http://localhost:3001

exit
