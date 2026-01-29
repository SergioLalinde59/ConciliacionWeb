function Check-Docker {
    $dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if (-not $dockerProcess) {
        Write-Host "Docker Desktop not running. Starting it..." -ForegroundColor Cyan
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Write-Host "Waiting for Docker..." -ForegroundColor Cyan
        do { Start-Sleep -Seconds 5; $dockerInfo = docker info 2>&1 } until ($LASTEXITCODE -eq 0)
        Write-Host "Docker is ready!" -ForegroundColor Cyan
    }
}

Clear-Host
Write-Host "============================" -ForegroundColor Cyan
Write-Host "   MVTOS APP - LAUNCHER     " -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host "1. Start ALL (Backend + Frontend)"
Write-Host "2. Start BACKEND Only"
Write-Host "3. Start FRONTEND Only"
Write-Host "4. Stop ALL Containers"
Write-Host "5. Clean Docker Cache & Start ALL"
Write-Host "============================" -ForegroundColor Cyan

$choice = Read-Host "Select an option (1-5)"

Check-Docker

switch ($choice) {
    "1" {
        Write-Host "Starting ALL services..." -ForegroundColor Green
        docker-compose up -d --build
        Write-Host "Showing logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker-compose logs -f
    }
    "2" {
        & ./arranque_backend.ps1
    }
    "3" {
        & ./arranque_frontend.ps1
    }
    "4" {
        Write-Host "Stopping all containers..." -ForegroundColor Yellow
        docker-compose down
    }
    "5" {
        Write-Host "Cleaning cache and rebuilding..." -ForegroundColor Yellow
        docker builder prune -af
        docker-compose up -d --build
        docker-compose logs -f
    }
    Default {
        Write-Host "Invalid option." -ForegroundColor Red
    }
}
