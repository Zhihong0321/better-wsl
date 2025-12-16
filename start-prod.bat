@echo off
setlocal
echo.
echo ========================================
echo   Better WSL - Production Mode
echo ========================================
echo.

if "%PORT%"=="" set PORT=3000
if "%VITE_PORT%"=="" set VITE_PORT=5173

REM Check if dist folder exists
if not exist "%~dp0client\dist" (
    echo [WARNING] No production build found. Building now...
    echo.
    cd /d "%~dp0client"
    call npm run build
    cd /d "%~dp0"
    echo.
)

echo Starting backend on %PORT% ...
start "Better WSL - Server" cmd /k "cd /d %~dp0server && set PORT=%PORT% && node index.js"

echo Starting frontend (production preview) on %VITE_PORT% ...
start "Better WSL - Client" cmd /k "cd /d %~dp0client && npm run preview -- --host --port %VITE_PORT%"

echo.
echo Backend:  http://localhost:%PORT%
echo Frontend: http://localhost:%VITE_PORT%
echo.
echo [PRODUCTION MODE] Using pre-built assets for faster load times.
echo Leave the opened terminals running; close them to stop.
echo.
pause
