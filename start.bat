@echo off
setlocal
echo.
echo =====================================
echo   Better CLI - Starting (Dev)
echo =====================================
echo.

if "%PORT%"=="" set PORT=3000
if "%VITE_PORT%"=="" set VITE_PORT=5173

echo Starting backend on %PORT% ...
start "Better CLI - Server" cmd /k "cd /d %~dp0server && set PORT=%PORT% && node index.js"

echo Starting frontend dev server on %VITE_PORT% ...
start "Better CLI - Client" cmd /k "cd /d %~dp0client && npm run dev -- --host --port %VITE_PORT%"

echo.
echo Backend:  http://localhost:%PORT%
echo Frontend: http://localhost:%VITE_PORT%
echo.
echo Leave the opened terminals running; close them to stop.
echo.
pause
