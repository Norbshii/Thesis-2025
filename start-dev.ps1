# PinPoint Attendance - Development Server Starter
# This script starts both Laravel backend and React frontend

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   🚀 STARTING PINPOINT DEV SERVERS" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

# Kill any existing processes
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start Laravel backend in new PowerShell window
Write-Host "🔧 Starting Laravel Backend (Port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Write-Host '============================================' -ForegroundColor Cyan;
Write-Host '   LARAVEL BACKEND SERVER' -ForegroundColor Green;
Write-Host '   http://127.0.0.1:8000' -ForegroundColor Yellow;
Write-Host '============================================' -ForegroundColor Cyan;
Write-Host '';
cd '$PSScriptRoot';
php artisan serve
"@

# Wait for backend to start
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "✅ Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend may not be running. Check the Laravel window." -ForegroundColor Yellow
}

# Start React frontend in current window
Write-Host "`n🎨 Starting React Frontend (Port 3000)..." -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

npm start

