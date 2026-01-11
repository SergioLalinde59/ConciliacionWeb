# Script de gestion de servicios Backend y Frontend
# Uso: . .\servicios.ps1  (para cargar las funciones)

# Funcion para arrancar el Backend
function Start-Backend {
    Write-Host "Iniciando Backend en nueva ventana..." -ForegroundColor Cyan
    $rootDir = Get-Location
    # Buscamos dinamicamente el directorio que termina en 'Web' para evitar problemas de codificacion
    $webDir = Get-ChildItem -Path $rootDir -Directory | Where-Object { $_.Name -like "*Web" } | Select-Object -First 1
    
    if ($null -eq $webDir) {
        Write-Error "No se encontro el directorio '*Web' (Ej: ConciliaciónBancariaWeb)"
        return
    }

    $backendPath = Join-Path $webDir.FullName "Backend"
    # Usamos python -m uvicorn para evitar el wrapper roto del venv
    $backendCmd = "cd '$backendPath'; & '$rootDir\.venv\Scripts\Activate.ps1'; python -m uvicorn src.infrastructure.api.main:app --reload --host 0.0.0.0 --port 8000"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
    Write-Host "Backend iniciado en ventana separada" -ForegroundColor Green
}

# Funcion para arrancar el Frontend
function Start-Frontend {
    Write-Host "Iniciando Frontend en nueva ventana..." -ForegroundColor Cyan
    $rootDir = Get-Location
    # Buscamos dinamicamente el directorio que termina en 'Web' para evitar problemas de codificacion
    $webDir = Get-ChildItem -Path $rootDir -Directory | Where-Object { $_.Name -like "*Web" } | Select-Object -First 1

    if ($null -eq $webDir) {
        Write-Error "No se encontro el directorio '*Web' (Ej: ConciliaciónBancariaWeb)"
        return
    }

    $frontendPath = Join-Path $webDir.FullName "Frontend"
    $frontendCmd = "cd '$frontendPath'; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
    Write-Host "Frontend iniciado en ventana separada" -ForegroundColor Green
}

# Funcion para listar procesos Python activos
function Get-PythonProcesses {
    Write-Host "Buscando procesos Python..." -ForegroundColor Yellow
    $processes = Get-Process python -ErrorAction SilentlyContinue
    if ($processes) {
        $processes | Select-Object Id, ProcessName, StartTime, CPU, @{Name = "Memory(MB)"; Expression = { [math]::Round($_.WS / 1MB, 2) } } | Format-Table -AutoSize
    }
    else {
        Write-Host "No hay procesos Python activos" -ForegroundColor Green
    }
}

# Funcion para verificar el estado de los servicios
function Get-ServiceStatus {
    Write-Host ""
    Write-Host "===== ESTADO DE SERVICIOS =====" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar Backend (Python)
    Write-Host "BACKEND (Python/FastAPI):" -ForegroundColor Yellow
    $pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
    if ($pythonProcesses) {
        Write-Host "  Estado: ACTIVO" -ForegroundColor Green
        Write-Host "  Procesos: $($pythonProcesses.Count)"
        $pythonProcesses | Select-Object Id, @{Name = "Uptime"; Expression = { (Get-Date) - $_.StartTime | ForEach-Object { "{0:hh\:mm\:ss}" -f $_ } } }, @{Name = "Memory(MB)"; Expression = { [math]::Round($_.WS / 1MB, 2) } } | Format-Table -AutoSize
    }
    else {
        Write-Host "  Estado: INACTIVO" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Verificar Frontend (Node)
    Write-Host "FRONTEND (Node/npm):" -ForegroundColor Yellow
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "  Estado: ACTIVO" -ForegroundColor Green
        Write-Host "  Procesos: $($nodeProcesses.Count)"
        $nodeProcesses | Select-Object Id, @{Name = "Uptime"; Expression = { (Get-Date) - $_.StartTime | ForEach-Object { "{0:hh\:mm\:ss}" -f $_ } } }, @{Name = "Memory(MB)"; Expression = { [math]::Round($_.WS / 1MB, 2) } } | Format-Table -AutoSize
    }
    else {
        Write-Host "  Estado: INACTIVO" -ForegroundColor Red
    }
    
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
}

# Funcion para terminar todos los procesos Python
function Stop-AllPython {
    Write-Host "Terminando procesos Python..." -ForegroundColor Red
    $processes = Get-Process python -ErrorAction SilentlyContinue
    if ($processes) {
        Stop-Process -Name python -Force
        Write-Host "Procesos Python terminados" -ForegroundColor Green
    }
    else {
        Write-Host "No hay procesos Python para terminar" -ForegroundColor Green
    }
}

# Funcion para terminar un proceso Python especifico por PID
function Stop-PythonProcess {
    param(
        [Parameter(Mandatory = $true)]
        [int]$PID
    )
    Write-Host "Terminando proceso Python con PID $PID..." -ForegroundColor Red
    Stop-Process -Id $PID -Force -ErrorAction SilentlyContinue
    Write-Host "Proceso terminado" -ForegroundColor Green
}

# Funcion para reiniciar Backend (termina Python y arranca de nuevo)
function Restart-Backend {
    Write-Host "Reiniciando Backend..." -ForegroundColor Magenta
    Stop-AllPython
    Start-Sleep -Seconds 2
    Start-Backend
}

# Funcion para arrancar ambos servicios en ventanas separadas
function Start-AllServices {
    Write-Host "Iniciando todos los servicios..." -ForegroundColor Cyan
    
    # Iniciar Backend en nueva ventana
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; . .\servicios.ps1; Start-Backend"
    
    # Esperar 3 segundos
    Start-Sleep -Seconds 3
    
    # Iniciar Frontend en nueva ventana
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; . .\servicios.ps1; Start-Frontend"
    
    Write-Host "Servicios iniciados en ventanas separadas" -ForegroundColor Green
}

# Mostrar ayuda
function Show-Help {
    Write-Host ""
    Write-Host "Comandos Disponibles:" -ForegroundColor White
    Write-Host "===========================================" -ForegroundColor White
    Write-Host ""
    Write-Host "Iniciar Servicios:" -ForegroundColor Cyan
    Write-Host "   Start-Backend          - Inicia el servidor Backend"
    Write-Host "   Start-Frontend         - Inicia el servidor Frontend"
    Write-Host "   Start-AllServices      - Inicia ambos en ventanas separadas"
    Write-Host ""
    Write-Host "Monitoreo:" -ForegroundColor Yellow
    Write-Host "   Get-ServiceStatus      - Muestra estado de Backend y Frontend"
    Write-Host "   Get-PythonProcesses    - Lista procesos Python activos"
    Write-Host ""
    Write-Host "Detener Servicios:" -ForegroundColor Red
    Write-Host "   Stop-AllPython         - Termina todos los procesos Python"
    Write-Host "   Stop-PythonProcess -PID <numero>  - Termina proceso especifico"
    Write-Host "   Restart-Backend        - Reinicia el Backend"
    Write-Host ""
    Write-Host "Ayuda:" -ForegroundColor Magenta
    Write-Host "   Show-Help              - Muestra esta ayuda"
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor White
    Write-Host ""
    Write-Host "Tip: Ejecuta '. .\servicios.ps1' para cargar las funciones" -ForegroundColor Gray
    Write-Host ""
}

# Mostrar mensaje al cargar el script
Write-Host ""
Write-Host "Script cargado correctamente!" -ForegroundColor Green
Write-Host "Ejecuta 'Show-Help' para ver los comandos disponibles" -ForegroundColor Gray
Write-Host ""
