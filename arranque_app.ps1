# Check if Docker is running
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue

if (-not $dockerProcess) {
    Write-Host "Docker Desktop not running. Starting it..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    # Wait for Docker to be ready
    Write-Host "Waiting for Docker Engine to be ready..."
    do {
        Start-Sleep -Seconds 5
        $dockerInfo = docker info 2>&1
    } until ($LASTEXITCODE -eq 0)
    Write-Host "Docker is ready!"
} else {
    Write-Host "Docker Desktop is already running."
}

# Run docker-compose commands
Write-Host "Stopping existing containers..."
docker-compose down

Write-Host "Building and starting containers..."
docker-compose up -d --build

Write-Host "Showing logs (Press Ctrl+C to exit logs)..."
docker-compose logs -f
