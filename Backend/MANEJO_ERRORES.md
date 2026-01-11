# Guía de Manejo de Errores

## Uso de Excepciones Personalizadas

### Lanzar excepciones en repositorios

```python
from src.domain.exceptions import MovimientoNotFoundException, DatabaseQueryException

class PostgresMovimientoRepository:
    def obtener_por_id(self, movimiento_id: int) -> Movimiento:
        try:
            cursor.execute("SELECT * FROM movimientos WHERE movimiento_id = %s", (movimiento_id,))
            result = cursor.fetchone()
            
            if not result:
                # Lanzar excepción de dominio
                raise MovimientoNotFoundException(movimiento_id)
                
            return self._row_to_movimiento(result)
            
        except psycopg2.Error as e:
            # Convertir excepciones de DB a excepciones del dominio
            raise DatabaseQueryException(
                query="SELECT * FROM movimientos WHERE...",
                original_error=e
            )
```

### Lanzar excepciones en servicios

```python
from src.domain.exceptions import ValidationException, ClasificacionException

class ClasificacionService:
    def clasificar_movimiento(self, movimiento_id: int, tercero_id: int):
        # Validación de negocio
        if movimiento_id <= 0:
            raise ValidationException(
                message="El ID del movimiento debe ser mayor a 0",
                details={"movimiento_id": movimiento_id}
            )
        
        # Regla de negocio
        if self._ya_esta_clasificado(movimiento_id):
            raise ClasificacionException(
                message="El movimiento ya está clasificado",
                movimiento_id=movimiento_id
            )
```

### En los routers (API endpoints)

**Los routers NO deben manejar las excepciones del dominio.**

Los exception handlers globales se encargan de convertirlas en respuestas HTTP:

```python
@router.get("/api/movimientos/{movimiento_id}")
async def obtener_movimiento(
    movimiento_id: int,
    repo: MovimientoRepository = Depends(get_movimiento_repo)
):
    # Simplemente llamar al repositorio
    # Si lanza MovimientoNotFoundException, el handler lo maneja automáticamente
    movimiento = repo.obtener_por_id(movimiento_id)
    return movimiento
```

## Mapeo de Excepciones a HTTP Status Codes

| Excepción | HTTP Status | Uso |
|-----------|-------------|-----|
| `EntityNotFoundException` | 404 | Entidad no encontrada |
| `ValidationException` | 400 | Datos inválidos |
| `BusinessRuleException` | 422 | Violación de regla de negocio |
| `FileProcessingException` | 400 | Error en archivo subido |
| `DatabaseConnectionException` | 503 | BD no disponible |
| `DatabaseQueryException` | 500 | Error en query |
| `DomainException` (genérica) | 500 | Error inesperado |

## Logging Automático

Todas las excepciones se loguean automáticamente:

- **WARNING**: EntityNotFoundException, ValidationException, BusinessRuleException
- **ERROR**: DatabaseException, excepciones generales

No es necesario añadir `logger.error()` en cada catch.

## Variables de Entorno

Configurar en `.env`:

```env
# Nivel de logging
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL

# Directorio de logs (opcional)
LOG_DIR=logs
```

## Archivos de Log

- `logs/backend_development.log` - Todos los logs
- `logs/errors_development.log` - Solo errores (ERROR y CRITICAL)

En producción:
- `logs/backend_production.log`
- `logs/errors_production.log`
