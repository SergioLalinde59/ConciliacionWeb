# Script para limpiar caché de Docker y reconstruir
# Útil cuando hay errores de snapshots corruptos

Write-Host "Limpiando caché de Docker..." -ForegroundColor Yellow

# Detener contenedores
Write-Host "`nDeteniendo contenedores..." -ForegroundColor Cyan
docker-compose down

# Limpiar caché de build
Write-Host "`nLimpiando caché de build..." -ForegroundColor Cyan
docker builder prune -af

# Opcional: Limpiar todo (descomentar si es necesario)
# Write-Host "`nLimpiando volúmenes y redes..." -ForegroundColor Cyan
# docker system prune -af --volumes

# Reconstruir y levantar
Write-Host "`nReconstruyendo contenedores..." -ForegroundColor Cyan
docker-compose build --no-cache

Write-Host "`nLevantando contenedores..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "`n✅ Proceso completado!" -ForegroundColor Green
Write-Host "Usa 'docker-compose logs -f' para ver los logs" -ForegroundColor Yellow
