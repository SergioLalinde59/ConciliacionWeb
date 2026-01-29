param(
    [string]$Action
)

function Get-PortProcess {
    param($Port)
    $tcp = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($tcp) {
        return Get-Process -Id $tcp.OwningProcess -ErrorAction SilentlyContinue
    }
    return $null
}

function Check-Status {
    Write-Host "`n=== STATUS CHECK ===" -ForegroundColor Cyan
    
    $backend = Get-PortProcess 8000
    if ($backend) {
        Write-Host "Backend (Port 8000): RUNNING (PID: $($backend.Id))" -ForegroundColor Green
    }
    else {
        Write-Host "Backend (Port 8000): STOPPED" -ForegroundColor Red
    }

    $frontend = Get-PortProcess 5173
    if ($frontend) {
        Write-Host "Frontend (Port 5173): RUNNING (PID: $($frontend.Id))" -ForegroundColor Green
    }
    else {
        Write-Host "Frontend (Port 5173): STOPPED" -ForegroundColor Red
    }
    Write-Host "====================`n" -ForegroundColor Cyan
}

function Stop-Services {
    Write-Host "Stopping services..." -ForegroundColor Yellow
    
    $backend = Get-PortProcess 8000
    if ($backend) {
        Stop-Process -Id $backend.Id -Force
        Write-Host "Backend (PID $($backend.Id)) stopped." -ForegroundColor Green
    }
    else {
        Write-Host "Backend was not running." -ForegroundColor Gray
    }

    $frontend = Get-PortProcess 5173
    if ($frontend) {
        Stop-Process -Id $frontend.Id -Force
        Write-Host "Frontend (PID $($frontend.Id)) stopped." -ForegroundColor Green
    }
    else {
        Write-Host "Frontend was not running." -ForegroundColor Gray
    }
}

function Start-Services {
    Write-Host "Starting services..." -ForegroundColor Cyan
    
    $root = $PSScriptRoot
    $backendPath = Join-Path $root "Backend"
    $frontendPath = Join-Path $root "frontend"
    
    # Backend
    $backend = Get-PortProcess 8000
    if ($backend) {
        Write-Host "Backend is already running (PID $($backend.Id)). Skipping." -ForegroundColor Yellow
    }
    else {
        Write-Host "Starting Backend..."
        if (Test-Path "$root\.venv\Scripts\Activate.ps1") {
            # Use venv - python -m uvicorn to avoid broken wrapper
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; & '$root\.venv\Scripts\Activate.ps1'; python -m uvicorn src.infrastructure.api.main:app --reload --host 0.0.0.0 --port 8000"
        }
        else {
            # Try global python
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python -m uvicorn src.infrastructure.api.main:app --reload --host 0.0.0.0 --port 8000"
        }
    }
    
    # Frontend
    $frontend = Get-PortProcess 5173
    if ($frontend) {
        Write-Host "Frontend is already running (PID $($frontend.Id)). Skipping." -ForegroundColor Yellow
    }
    else {
        Write-Host "Starting Frontend..."
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"
    }
    
    Write-Host "Service launch check complete." -ForegroundColor Green
}

# Main Entry Point
if ($Action) {
    switch ($Action.ToLower()) {
        "check" { Check-Status }
        "start" { Start-Services }
        "stop" { Stop-Services }
        "restart" { Stop-Services; Start-Services }
        default { Write-Host "Invalid action. Use: check, start, stop, or restart." -ForegroundColor Red }
    }
}
else {
    # Interactive Menu
    while ($true) {
        Write-Host "Select an option:"
        Write-Host "1. Check Status"
        Write-Host "2. Start Services"
        Write-Host "3. Stop Services"
        Write-Host "4. Restart Services"
        Write-Host "5. Exit"
        
        $choice = Read-Host "Enter choice (1-5)"
        
        switch ($choice) {
            "1" { Check-Status }
            "2" { Start-Services }
            "3" { Stop-Services }
            "4" { Stop-Services; Start-Services }
            "5" { exit }
            default { Write-Host "Invalid choice." -ForegroundColor Red }
        }
    }
}
