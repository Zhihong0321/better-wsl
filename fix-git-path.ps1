# ===================================================================
# Fix Git Path Configuration (PowerShell Version)
# Adds D:\PortableGit to Windows PATH so all software can access Git
# ===================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Git Path Configuration Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please right-click this file and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Check if Git is already in PATH
Write-Host "Checking Git installation..."
$gitInPath = Get-Command git -ErrorAction SilentlyContinue

if ($gitInPath) {
    Write-Host "[OK] Git is already accessible in PATH" -ForegroundColor Green
    Write-Host "    Found at: $($gitInPath.Source)" -ForegroundColor Gray
    Write-Host ""
    $reconfigure = Read-Host "Do you want to reconfigure PATH anyway? (Y/N)"
    if ($reconfigure -ne 'Y' -and $reconfigure -ne 'y') {
        Write-Host "Exiting..."
        exit 0
    }
} else {
    Write-Host "[!] Git not found in PATH" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Verifying PortableGit installation..."

$gitExePath = "D:\PortableGit\cmd\git.exe"
if (Test-Path $gitExePath) {
    Write-Host "[OK] Found Git at: $gitExePath" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Git not found at $gitExePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please verify your Git installation path." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Adding Git to System PATH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current System PATH
$pathKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment"
$currentPath = (Get-ItemProperty -Path $pathKey -Name Path).Path

# Define Git paths to add
$gitPaths = @(
    "D:\PortableGit\cmd",
    "D:\PortableGit\bin",
    "D:\PortableGit\usr\bin"
)

# Split current PATH into array
$pathArray = $currentPath -split ';'

# Add Git paths if not already present
$pathModified = $false
foreach ($gitPath in $gitPaths) {
    if ($pathArray -contains $gitPath) {
        Write-Host "[INFO] $gitPath already in PATH" -ForegroundColor Gray
    } else {
        Write-Host "[+] Adding: $gitPath" -ForegroundColor Green
        $pathArray += $gitPath
        $pathModified = $true
    }
}

if ($pathModified) {
    # Join paths back together
    $newPath = $pathArray -join ';'
    
    Write-Host ""
    Write-Host "Updating System PATH..."
    
    try {
        Set-ItemProperty -Path $pathKey -Name Path -Value $newPath
        Write-Host "[OK] System PATH updated successfully!" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to update PATH: $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[INFO] All Git paths already in PATH, no changes needed" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Notifying System of Changes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Broadcast environment change
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Environment {
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
        uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
}
"@

$HWND_BROADCAST = [IntPtr]0xffff
$WM_SETTINGCHANGE = 0x1a
$result = [UIntPtr]::Zero
[Environment]::SendMessageTimeout($HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "Environment", 2, 5000, [ref]$result) | Out-Null

Write-Host "[OK] Environment change notification sent" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Refresh PATH for current session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Test Git command
Write-Host "Testing Git command..."
try {
    $gitVersion = git --version 2>&1
    Write-Host "[OK] Git is now accessible!" -ForegroundColor Green
    Write-Host "    $gitVersion" -ForegroundColor Gray
} catch {
    Write-Host "[!] Git command still not working in current session" -ForegroundColor Yellow
    Write-Host "    This is normal - you need to restart your terminal/IDE" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Git paths have been added to System PATH:"
Write-Host "  - D:\PortableGit\cmd" -ForegroundColor Yellow
Write-Host "  - D:\PortableGit\bin" -ForegroundColor Yellow
Write-Host "  - D:\PortableGit\usr\bin" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: To apply changes:" -ForegroundColor Cyan
Write-Host "  1. Close and reopen all terminal windows" -ForegroundColor White
Write-Host "  2. Restart any IDEs (VS Code, Visual Studio, etc.)" -ForegroundColor White
Write-Host "  3. Restart Better CLI if it's running" -ForegroundColor White
Write-Host ""
Write-Host "After restarting, Git will be available system-wide!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
