$BaseUrl = "http://localhost:8000/api"

# 1. Obtener Cuentas
$cuentas = Invoke-RestMethod -Uri "$BaseUrl/cuentas" -Method Get
if ($cuentas.Count -eq 0) {
    Write-Error "No hay cuentas para probar."
    exit
}
$cuenta = $cuentas[0]
$cuentaId = $cuenta.id
Write-Host "Probando con Cuenta: $($cuenta.nombre) (ID: $cuentaId)"

# 2. Definir Periodo de Prueba
$year = 2025
$month = 1

# 3. Consultar Conciliacion Antes (Opcional, para ver estado)
try {
    $conciliacion = Invoke-RestMethod -Uri "$BaseUrl/conciliaciones/$cuentaId/$year/$month" -Method Get
    Write-Host "Estado Conciliación Antes: $($conciliacion.estado)"
    Write-Host "Sistema Entradas: $($conciliacion.sistema_entradas)"
} catch {
    Write-Host "No existe conciliación previa, se creará/reseteará igual."
}

# 4. Ejecutar Reset (Desvincular Todo)
Write-Host "`nEjecutando Reset del Periodo $year-$month..."
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/matching/desvincular-todo/$cuentaId/$year/$month" -Method Post
    Write-Host "Respuesta: $($response.mensaje)"
    Write-Host "Vinculaciones Eliminadas: $($response.eliminados)"
} catch {
    Write-Error "Error ejecutando reset: $_"
    exit
}

# 5. Verificar Conciliacion Despues
Write-Host "`nVerificando Estado Post-Reset..."
$conciliacionDespues = Invoke-RestMethod -Uri "$BaseUrl/conciliaciones/$cuentaId/$year/$month" -Method Get
Write-Host "Sistema Entradas (Total Libro): $($conciliacionDespues.sistema_entradas)"
Write-Host "Sistema Salidas (Total Libro): $($conciliacionDespues.sistema_salidas)"

# Validar que sistema_entradas NO sea 0 (si hay movimientos en el libro)
# Si es 0 puede que no haya movimientos, pero lo importante es que no de error.
