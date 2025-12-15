@echo off
echo ========================================
echo  Better CLI - Standalone Setup
echo ========================================
echo.
echo Starting setup wizard...
echo.

cd /d "%~dp0"

REM Start setup server
start "Better CLI Setup Server" cmd /c "cd server && node setup-server.js"

timeout /t 2 /nobreak >nul

REM Start setup client
start "Better CLI Setup Client" cmd /c "cd client && npm run dev -- --host --port 5174"

timeout /t 3 /nobreak >nul

REM Open browser to setup page
start http://localhost:5174/setup.html

echo.
echo Setup wizard opened in browser at http://localhost:5174
echo.
echo When setup is complete, close this window and run start.bat
echo.
pause
