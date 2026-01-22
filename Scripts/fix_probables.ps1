$baseUrl = "http://localhost:8000/api/matching"
$cuentaId = 1
$year = 2025
$month = 12

Write-Host "Connecting to $baseUrl..."

try {
    $matchesResponse = Invoke-RestMethod -Uri "$baseUrl/$cuentaId/$year/$month" -Method Get -ErrorAction Stop
    $matches = $matchesResponse.matches
    $probables = $matches | Where-Object { $_.estado -eq 'PROBABLE' }
    
    if (-not $probables) {
        Write-Host "No PROBABLE matches found."
        exit
    }
    
    Write-Host "Found $($probables.Count) PROBABLE matches. Attempting to approve..."
    
    foreach ($m in $probables) {
        $body = @{
            movimiento_extracto_id = $m.mov_extracto.id
            movimiento_id          = $m.mov_sistema.id
            usuario                = "sistema_fix"
            notas                  = "Auto-fixing from pending probables"
        } | ConvertTo-Json
        
        $linkUrl = "$baseUrl/vincular"
        try {
            $resp = Invoke-RestMethod -Uri $linkUrl -Method Post -Body $body -ContentType "application/json"
            Write-Host "Success: Linked Ex:$($m.mov_extracto.id) -> Sys:$($m.mov_sistema.id) - State: $($resp.estado)"
        }
        catch {
            Write-Host "Failed to link Ex:$($m.mov_extracto.id): $($_.Exception.Message)"
        }
    }
}
catch {
    Write-Host "Error: $_"
    exit 1
}
