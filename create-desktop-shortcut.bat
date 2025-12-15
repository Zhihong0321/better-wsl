@echo off
echo.
echo ====================================
echo   Creating Desktop Shortcut
echo ====================================
echo.

set "SCRIPT=%~dp0start-silent.vbs"
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\Better WSL.lnk"

echo Creating shortcut on Desktop...

powershell -Command "$WS = New-Object -ComObject WScript.Shell; $SC = $WS.CreateShortcut('%SHORTCUT%'); $SC.TargetPath = '%SCRIPT%'; $SC.WorkingDirectory = '%~dp0'; $SC.Description = 'Better WSL - WSL AI Multi-Session Wrapper'; $SC.Save()"

if exist "%SHORTCUT%" (
    echo.
    echo ====================================
    echo   SUCCESS!
    echo ====================================
    echo.
    echo Shortcut created: Better WSL.lnk
    echo Location: Desktop
    echo.
    echo You can now double-click the
    echo "Better WSL" icon on your desktop!
    echo ====================================
) else (
    echo.
    echo ====================================
    echo   ERROR
    echo ====================================
    echo.
    echo Failed to create shortcut.
    echo Please try creating it manually.
    echo ====================================
)

echo.
echo Press any key to exit...
pause >nul
