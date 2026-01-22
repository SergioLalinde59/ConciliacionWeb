# Create logs directory if it doesn't exist
$logsDir = "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

$logFile = Join-Path $logsDir "ps.log"

# Function to write to both console and log file
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage -ForegroundColor Cyan
    Add-Content -Path $logFile -Value $logMessage
}

# Clear previous log
if (Test-Path $logFile) {
    Clear-Content $logFile
}

Write-Log "=== Starting application setup ==="

# Check if Docker is running
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue

if (-not $dockerProcess) {
    Write-Log "Docker Desktop not running. Starting it..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    # Wait for Docker to be ready
    Write-Log "Waiting for Docker Engine to be ready..."
    do {
        Start-Sleep -Seconds 5
        $dockerInfo = docker info 2>&1
        Add-Content -Path $logFile -Value $dockerInfo
    } until ($LASTEXITCODE -eq 0)
    Write-Log "Docker is ready!"
}
else {
    Write-Log "Docker Desktop is already running."
}

# Run docker-compose commands
Write-Log "Stopping existing containers..."
docker-compose down 2>&1 | Tee-Object -FilePath $logFile -Append

# Clean Docker build cache to prevent snapshot errors
Write-Log "Cleaning Docker build cache..."
docker builder prune -af 2>&1 | Tee-Object -FilePath $logFile -Append

Write-Log "Building and starting containers..."
docker-compose up -d --build 2>&1 | Tee-Object -FilePath $logFile -Append

Write-Log "Showing logs (Press Ctrl+C to exit logs)..."
Write-Log "All output is being saved to: $logFile"
docker-compose logs -f 2>&1 | Tee-Object -FilePath $logFile -Append

