@echo off
REM ===================================================================
REM Fix Git Path Configuration
REM Adds D:\PortableGit to Windows PATH so all software can access Git
REM ===================================================================

echo.
echo ========================================
echo   Git Path Configuration Tool
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with Administrator privileges
) else (
    echo [ERROR] This script requires Administrator privileges!
    echo.
    echo Please right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo Checking Git installation...

REM Check if Git is already in PATH
where git >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Git is already accessible in PATH
    for /f "delims=" %%i in ('where git') do echo     Found at: %%i
    echo.
    choice /C YN /M "Do you want to reconfigure PATH anyway"
    if errorlevel 2 goto :end
) else (
    echo [!] Git not found in PATH
)

echo.
echo Verifying PortableGit installation...

if exist "D:\PortableGit\cmd\git.exe" (
    echo [OK] Found Git at: D:\PortableGit\cmd\git.exe
) else (
    echo [ERROR] Git not found at D:\PortableGit\cmd\git.exe
    echo.
    echo Please verify your Git installation path.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Adding Git to System PATH
echo ========================================
echo.

REM Get current PATH
for /f "skip=2 tokens=3*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path') do set "CURRENT_PATH=%%a %%b"

REM Remove trailing spaces
set "CURRENT_PATH=%CURRENT_PATH:~0,-1%"

REM Define Git paths to add
set "GIT_CMD=D:\PortableGit\cmd"
set "GIT_BIN=D:\PortableGit\bin"
set "GIT_USR_BIN=D:\PortableGit\usr\bin"

REM Check if paths already exist
echo %CURRENT_PATH% | findstr /C:"%GIT_CMD%" >nul
if %errorLevel% == 0 (
    echo [INFO] D:\PortableGit\cmd already in PATH
) else (
    echo [+] Adding: %GIT_CMD%
    set "CURRENT_PATH=%CURRENT_PATH%;%GIT_CMD%"
)

echo %CURRENT_PATH% | findstr /C:"%GIT_BIN%" >nul
if %errorLevel% == 0 (
    echo [INFO] D:\PortableGit\bin already in PATH
) else (
    echo [+] Adding: %GIT_BIN%
    set "CURRENT_PATH=%CURRENT_PATH%;%GIT_BIN%"
)

echo %CURRENT_PATH% | findstr /C:"%GIT_USR_BIN%" >nul
if %errorLevel% == 0 (
    echo [INFO] D:\PortableGit\usr\bin already in PATH
) else (
    echo [+] Adding: %GIT_USR_BIN%
    set "CURRENT_PATH=%CURRENT_PATH%;%GIT_USR_BIN%"
)

echo.
echo Updating System PATH...

REM Update PATH in registry
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path /t REG_EXPAND_SZ /d "%CURRENT_PATH%" /f >nul 2>&1

if %errorLevel% == 0 (
    echo [OK] System PATH updated successfully!
) else (
    echo [ERROR] Failed to update PATH
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Notifying System of Changes
echo ========================================
echo.

REM Broadcast WM_SETTINGCHANGE to notify running applications
setx DUMMY_VAR "" >nul 2>&1
echo [OK] Environment change notification sent

echo.
echo ========================================
echo   Verification
echo ========================================
echo.

REM Update PATH for current session
set "PATH=%CURRENT_PATH%;%PATH%"

REM Test Git command
echo Testing Git command...
git --version >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Git is now accessible!
    git --version
) else (
    echo [!] Git command still not working in current session
    echo     This is normal - you need to restart your terminal/IDE
)

echo.
echo ========================================
echo   SUCCESS!
echo ========================================
echo.
echo Git paths have been added to System PATH:
echo   - D:\PortableGit\cmd
echo   - D:\PortableGit\bin
echo   - D:\PortableGit\usr\bin
echo.
echo IMPORTANT: To apply changes:
echo   1. Close and reopen all terminal windows
echo   2. Restart any IDEs (VS Code, Visual Studio, etc.)
echo   3. Restart Better CLI if it's running
echo.
echo After restarting, Git will be available system-wide!
echo.

:end
pause
