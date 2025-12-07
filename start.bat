@echo off
echo.
echo =====================================
echo   Better CLI - Starting...
echo =====================================
echo.

REM Check if backend is already running (port 3000)
netstat -an | findstr ":3000 " >nul
if %errorlevel% == 0 (
    set BACKEND_RUNNING=1
    echo Backend already running on port 3000
) else (
    set BACKEND_RUNNING=0
)

REM Check if frontend is already running (port 5173)
netstat -an | findstr ":5173 " >nul
if %errorlevel% == 0 (
    set FRONTEND_RUNNING=1
    echo Frontend already running on port 5173
) else (
    set FRONTEND_RUNNING=0
)

REM If both are running, just open browser
if %BACKEND_RUNNING%==1 if %FRONTEND_RUNNING%==1 (
    echo.
    echo =====================================
    echo   Already Running!
    echo =====================================
    echo.
    echo Opening browser...
    start http://localhost:5173
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 0
)

REM Start backend if not running
if %BACKEND_RUNNING%==0 (
    echo [1/2] Starting Backend Server...
    cd /d "%~dp0server"
    start "Better CLI - Server" cmd /k "node index.js"
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] Backend already running, skipping...
)

REM Start frontend if not running
if %FRONTEND_RUNNING%==0 (
    echo [2/2] Starting Frontend Client...
    cd /d "%~dp0client"
    start "Better CLI - Client" cmd /k "npm run dev -- --host"
    timeout /t 5 /nobreak >nul
) else (
    echo [2/2] Frontend already running, skipping...
)

echo.
echo Opening browser...
start http://localhost:5173

echo.
echo =====================================
echo   Better CLI is now running!
echo =====================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo.
echo   Close this window to keep services running
echo   Or press any key to exit
echo =====================================
pause >nul
