
## Gestión de Conexiones

El sistema utiliza un **connection pool** con las siguientes características:

- **Lazy initialization**: Se crea al primer uso
- **Pool size**: Configurable vía variables de entorno
- **Lifecycle management**: Controlado por FastAPI lifespan
- **Cierre graceful**: Todas las conexiones se cierran al shutdown

## Middleware y Cross-Cutting Concerns

### CORS
- Configurado para múltiples orígenes (desarrollo y producción)
- Permite credenciales
- Todos los métodos y headers

### Exception Handling
- Manejo centralizado de errores
- Conversión automática de excepciones de dominio
- Logging de errores
- Respuestas HTTP estandarizadas

### Logging
- Logger configurado centralmente
- Diferentes niveles (INFO, DEBUG, ERROR, etc.)
- Archivos de log rotativos
- Formato estructurado

## Ventajas de esta Arquitectura

1. **Separación de Responsabilidades**: Cada capa tiene un propósito claro
2. **Testabilidad**: El dominio se puede testear sin dependencias externas
3. **Flexibilidad**: Fácil cambiar frameworks o bases de datos
4. **Mantenibilidad**: Código organizado y predecible
5. **Escalabilidad**: Fácil agregar nuevas funcionalidades
6. **Independencia del Framework**: La lógica de negocio no depende de FastAPI
7. **Inversión de Dependencias**: El dominio no conoce la infraestructura

## Variables de Entorno

El sistema se configura mediante variables de entorno (.env):

- `API_HOST`: Host del servidor (default: 0.0.0.0)
- `API_PORT`: Puerto del servidor (default: 8000)
- `DATABASE_URL`: URL de conexión a PostgreSQL
- `ENVIRONMENT`: Entorno (development/production)
- Otras configuraciones específicas de servicios

## Docker

- **Dockerfile**: Configuración para containerizar el backend
- **docker-compose.yml**: Orquestación multi-contenedor
- Separación de entornos (desarrollo/producción)

## Scripts de Utilidad

El proyecto incluye varios scripts en la raíz del backend:

- `check_db.py`: Verificación de conexión a BD
- `check_counts.py`: Conteo de registros
- `debug_*.py`: Scripts de debugging
- `migrate_*.py`: Scripts de migración de datos
- `verify_*.py`: Scripts de verificación

## Testing

- Directorio `tests/` para pruebas
- `.pytest_cache/` para caché de pytest
- Estructura de tests espejo a la estructura src/

## Conclusión

Esta arquitectura hexagonal proporciona una base sólida, mantenible y escalable para el sistema de conciliación bancaria, permitiendo evolucionar el sistema sin comprometer la lógica de negocio core.
