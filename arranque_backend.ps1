# Check if Docker is running
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue

if (-not $dockerProcess) {
    Write-Host "Docker Desktop not running. Starting it..." -ForegroundColor Cyan
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    # Wait for Docker to be ready
    Write-Host "Waiting for Docker Engine to be ready..." -ForegroundColor Cyan
    do {
        Start-Sleep -Seconds 5
        $dockerInfo = docker info 2>&1
    } until ($LASTEXITCODE -eq 0)
    Write-Host "Docker is ready!" -ForegroundColor Cyan
}
else {
    Write-Host "Docker Desktop is already running." -ForegroundColor Cyan
}

Write-Host "Building and starting BACKEND..." -ForegroundColor Green
docker-compose up -d --build backend

Write-Host "Showing logs for BACKEND (Press Ctrl+C to exit)..." -ForegroundColor Cyan
docker-compose logs -f backend
