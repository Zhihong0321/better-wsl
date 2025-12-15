# Better WSL - PowerShell Launcher
# Run this with: powershell -ExecutionPolicy Bypass -File start.ps1

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Better WSL - Starting..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Check if services are already running
$backendRunning = Test-Port -Port 3000
$frontendRunning = Test-Port -Port 5173

if ($backendRunning -and $frontendRunning) {
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  Already Running!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Opening browser..." -ForegroundColor Yellow
    Start-Process "http://localhost:5173"
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# Start Backend Server if not running
if (-not $backendRunning) {
    Write-Host "[1/2] Starting Backend Server..." -ForegroundColor Yellow
    $serverPath = Join-Path $scriptPath "server"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serverPath'; node index.js" -WindowStyle Normal
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/2] Backend already running, skipping..." -ForegroundColor Green
}

# Start Frontend Client if not running
if (-not $frontendRunning) {
    Write-Host "[2/2] Starting Frontend Client..." -ForegroundColor Yellow
    $clientPath = Join-Path $scriptPath "client"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$clientPath'; npm run dev -- --host" -WindowStyle Normal
    Start-Sleep -Seconds 5
} else {
    Write-Host "[2/2] Frontend already running, skipping..." -ForegroundColor Green
}

# Open browser
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  Better WSL is now running!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  Press any key to exit this window" -ForegroundColor Gray
Write-Host "  (Services will keep running)" -ForegroundColor Gray
Write-Host "=====================================" -ForegroundColor Green

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
