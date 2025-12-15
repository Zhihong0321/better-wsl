@echo off
echo.
echo =====================================
echo   Better WSL - Stopping...
echo =====================================
echo.

echo Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

if %errorlevel% == 0 (
    echo.
    echo =====================================
    echo   Better WSL has been stopped!
    echo =====================================
) else (
    echo.
    echo =====================================
    echo   No running instances found
    echo =====================================
)

echo.
echo Press any key to exit...
pause >nul
