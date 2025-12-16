@echo off
echo ========================================
echo   Better WSL - Building Frontend
echo ========================================
echo.

cd /d "%~dp0client"
echo Running: npm run build
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Production build saved to: client\dist
    echo.
    echo To run in production mode, use:
    echo   start-prod.bat
    echo.
) else (
    echo.
    echo ========================================
    echo   BUILD FAILED!
    echo ========================================
    echo.
)

cd /d "%~dp0"
pause
