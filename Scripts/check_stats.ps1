$baseUrl = "http://localhost:8000/api/matching"
$cuentaId = 1
$year = 2025
$month = 12

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/$cuentaId/$year/$month" -Method Get -ErrorAction Stop
    $stats = $response.estadisticas
    
    Write-Host "--- Statistics ---"
    Write-Host "Total Extracto: $($stats.total_extracto)"
    Write-Host "Total Sistema: $($stats.total_sistema)"
    Write-Host "Exactos: $($stats.exactos)"
    Write-Host "Probables: $($stats.probables)"
    Write-Host "Sin Match: $($stats.sin_match)"
    Write-Host "Ignorados: $($stats.ignorados)"
    
    $processed = $stats.exactos + $stats.sin_match + $stats.ignorados
    if ($stats.total_extracto -gt 0) {
        $progress = ($processed / $stats.total_extracto) * 100
        Write-Host "Calculated Progress: $($progress.ToString("F0"))%"
    }
    else {
        Write-Host "No extract items."
    }
}
catch {
    Write-Host "Error: $_"
}
