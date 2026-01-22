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

# Run docker-compose commands
Write-Host "Stopping existing containers..." -ForegroundColor Cyan
docker-compose down

# Clean Docker build cache to prevent snapshot errors
Write-Host "Cleaning Docker build cache..." -ForegroundColor Cyan
docker builder prune -af

Write-Host "Building and starting containers..." -ForegroundColor Cyan
docker-compose up -d --build

Write-Host "Showing logs (Press Ctrl+C to exit logs)..." -ForegroundColor Cyan
docker-compose logs -f

