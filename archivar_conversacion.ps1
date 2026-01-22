# Script para archivar documentos de conversaciones de Antigravity
# Uso: .\archivar_conversacion.ps1 -ConversacionId "fb266add-4f19-4edb-80bd-8c55ba73da59" -Nombre "Descripcion_Breve"

param(
    [Parameter(Mandatory = $false)]
    [string]$ConversacionId,
    
    [Parameter(Mandatory = $false)]
    [string]$Nombre = "Conversacion",
    
    [Parameter(Mandatory = $false)]
    [switch]$ListarConversaciones
)

$artifactsDir = "F:\1. Cloud\.gemini\antigravity\brain"
$destinoDir = "F:\1. Cloud\4. AI\1. Antigravity\ConciliacionWeb\Documentos\Conversaciones"

# Funcion para listar todas las conversaciones disponibles
function Listar-Conversaciones {
    Write-Host "`n=== Conversaciones Disponibles ===" -ForegroundColor Cyan
    
    if (Test-Path $artifactsDir) {
        $conversaciones = Get-ChildItem -Path $artifactsDir -Directory
        
        foreach ($conv in $conversaciones) {
            $archivos = Get-ChildItem -Path $conv.FullName -Filter "*.md" -ErrorAction SilentlyContinue
            
            if ($archivos.Count -gt 0) {
                Write-Host "`nID: $($conv.Name)" -ForegroundColor Yellow
                Write-Host "Archivos MD encontrados:" -ForegroundColor Gray
                
                foreach ($archivo in $archivos) {
                    $size = [math]::Round($archivo.Length / 1KB, 2)
                    Write-Host "  - $($archivo.Name) ($size KB)" -ForegroundColor White
                }
            }
        }
    }
    else {
        Write-Host "No se encontro el directorio de artifacts: $artifactsDir" -ForegroundColor Red
    }
}

# Funcion para archivar una conversacion especifica
function Archivar-Conversacion {
    param(
        [string]$Id,
        [string]$NombreArchivo
    )
    
    $origenDir = Join-Path $artifactsDir $Id
    
    if (-not (Test-Path $origenDir)) {
        Write-Host "Error: No se encontro la conversacion con ID: $Id" -ForegroundColor Red
        Write-Host "Ruta buscada: $origenDir" -ForegroundColor Gray
        return
    }
    
    # Crear directorio de destino si no existe
    if (-not (Test-Path $destinoDir)) {
        New-Item -ItemType Directory -Path $destinoDir -Force | Out-Null
        Write-Host "Creado directorio: $destinoDir" -ForegroundColor Green
    }
    
    # Obtener fecha actual
    $fecha = Get-Date -Format "yyyy-MM-dd"
    
    # Buscar archivos .md en el directorio de la conversacion
    $archivosMd = Get-ChildItem -Path $origenDir -Filter "*.md"
    
    if ($archivosMd.Count -eq 0) {
        Write-Host "Advertencia: No se encontraron archivos .md en la conversacion $Id" -ForegroundColor Yellow
        return
    }
    
    Write-Host "`n=== Archivando Conversacion ===" -ForegroundColor Cyan
    Write-Host "Origen: $origenDir" -ForegroundColor Gray
    Write-Host "Destino: $destinoDir`n" -ForegroundColor Gray
    
    $archivados = 0
    
    foreach ($archivo in $archivosMd) {
        # Crear nombre de archivo con fecha y nombre descriptivo
        $nuevoNombre = "${fecha}_${NombreArchivo}_$($archivo.BaseName).md"
        $rutaDestino = Join-Path $destinoDir $nuevoNombre
        
        # Copiar archivo
        Copy-Item -Path $archivo.FullName -Destination $rutaDestino -Force
        
        Write-Host "OK Archivado: $nuevoNombre" -ForegroundColor Green
        $archivados++
    }
    
    Write-Host "`nTotal archivado: $archivados archivo(s)" -ForegroundColor Cyan
    Write-Host "Ubicacion: $destinoDir" -ForegroundColor Gray
}

# Ejecucion principal
if ($ListarConversaciones) {
    Listar-Conversaciones
}
elseif ($ConversacionId) {
    Archivar-Conversacion -Id $ConversacionId -NombreArchivo $Nombre
}
else {
    Write-Host ""
    Write-Host "=== Script de Archivo de Conversaciones ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Cyan
    Write-Host "  1. Listar conversaciones disponibles:" -ForegroundColor White
    Write-Host "     .\archivar_conversacion.ps1 -ListarConversaciones" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Archivar una conversacion especifica:" -ForegroundColor White
    Write-Host "     .\archivar_conversacion.ps1 -ConversacionId ""ID"" -Nombre ""Descripcion""" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Cyan
    Write-Host "  .\archivar_conversacion.ps1 -ListarConversaciones" -ForegroundColor Gray
    Write-Host "  .\archivar_conversacion.ps1 -ConversacionId ""fb266add-4f19-4edb-80bd-8c55ba73da59"" -Nombre ""Matching_API""" -ForegroundColor Gray
    Write-Host ""
}
