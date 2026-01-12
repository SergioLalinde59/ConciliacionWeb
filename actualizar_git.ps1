# Script para sincronizar cambios con GitHub
# Repositorio: https://github.com/SergioLalinde59/ConciliacionWeb

$ErrorActionPreference = "Stop"

Clear-Host
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Sincronización con GitHub" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Pedir descripción para la actualización
$descripcion = Read-Host "Ingrese una descripción para la actualización"

# Validar descripción
if ([string]::IsNullOrWhiteSpace($descripcion)) {
    Write-Host "❌ Error: La descripción no puede estar vacía." -ForegroundColor Red
    Start-Sleep -Seconds 2
    exit 1
}

try {
    # 2. Agregar todos los cambios
    Write-Host "1. Agregando cambios..." -ForegroundColor Yellow
    git add .

    # 3. Realizar commit
    Write-Host "2. Confirmando cambios (Commit)..." -ForegroundColor Yellow
    # Verificamos si hay cambios para commitear primero para evitar error de git commit vacío si es el caso, 
    # aunque 'git add .' usualmente prepara algo si hay cambios. Si no hay cambios, git commit fallará o no hará nada.
    # Simplemente ejecutamos y capturamos error si es necesario, pero git commit devuelve 1 si no hay nada.
    
    $commitOutput = git commit -m "$descripcion" 2>&1
    if ($LASTEXITCODE -ne 0) {
        if ($commitOutput -match "nothing to commit") {
            Write-Host "⚠ No hay cambios nuevos para confirmar." -ForegroundColor Yellow
        }
        else {
            throw "Error en git commit: $commitOutput"
        }
    }
    else {
        Write-Host "   Commit realizado: $descripcion" -ForegroundColor Green
    }

    # 4. Enviar cambios (Push)
    Write-Host "3. Enviando cambios a GitHub (Push)..." -ForegroundColor Yellow
    git push origin main

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Actualización completada exitosamente." -ForegroundColor Green
    }
    else {
        throw "Error al ejecutar git push."
    }

}
catch {
    Write-Host ""
    Write-Host "❌ Ocurrió un error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Presione cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
