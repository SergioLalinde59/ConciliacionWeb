# Walkthrough: Fase 3 - Backend Infrastructure (API Endpoints)

**Fecha**: 2026-01-18  
**Título**: Develop API Endpoints for Matching System

---

## Resumen Ejecutivo

Se completó exitosamente la **Fase 3: Backend - Infraestructura** del sistema de conciliación inteligente con matching. Esta fase implementó los adaptadores de base de datos PostgreSQL y los endpoints REST API necesarios para ejecutar el algoritmo de matching y gestionar las vinculaciones entre movimientos del extracto bancario y movimientos del sistema.

---

## Componentes Implementados

### 1. Repositorios PostgreSQL (2)

#### [PostgresMovimientoVinculacionRepository](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/database/postgres_movimiento_vinculacion_repository.py)

**Métodos implementados** (8 total):
- ✅ `guardar()` - Crear/actualizar vinculaciones
- ✅ `obtener_por_periodo()` - Obtener vinculaciones de un periodo
- ✅ `obtener_por_extracto_id()` - Buscar vinculación específica
- ✅ `desvincular()` - Eliminar vinculación
- ✅ `actualizar_estado()` - Cambiar estado de vinculación
- ✅ `obtener_sin_confirmar()` - Filtrar por confirmación pendiente
- ✅ `obtener_por_estado()` - Filtrar por estado específico
- ✅ `obtener_traslados()` - Obtener solo traslados

**Características**:
- Manejo completo de transacciones (commit/rollback)
- Conversión entre modelos de dominio y tablas de BD
- Reconstrucción de objetos completos con relaciones
- Validaciones antes de operaciones destructivas

---

#### [PostgresConfiguracionMatchingRepository](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/database/postgres_configuracion_matching_repository.py)

**Métodos implementados** (5 total):
- ✅ `obtener_activa()` - Obtener configuración activa
- ✅ `obtener_por_id()` - Buscar configuración por ID
- ✅ `crear()` - Crear nueva configuración
- ✅ `actualizar()` - Actualizar configuración existente
- ✅ `activar()` - Activar configuración y desactivar las demás

**Características especiales**:
- Manejo automático de arrays PostgreSQL (`TEXT[]` ↔ `List[str]`)
- Conversión precisa de decimales para scores y pesos
- Garantía de una sola configuración activa mediante transacciones
- Validaciones automáticas del modelo de dominio

---

### 2. API REST (6 endpoints)

#### [matching.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/routers/matching.py)

Router FastAPI con endpoints para el sistema de matching.

---

#### Endpoint 1: `GET /api/matching/{cuenta_id}/{year}/{month}`

**Propósito**: Ejecutar el algoritmo de matching para un periodo

**Flujo de ejecución**:
1. Obtener configuración activa de matching
2. Obtener movimientos del extracto del periodo
3. Obtener movimientos del sistema del periodo
4. Ejecutar `MatchingService.ejecutar_matching()`
5. Guardar vinculaciones automáticas (EXACTO y PROBABLE)
6. Calcular estadísticas por estado
7. Retornar resultados con matches y estadísticas

**Response**:
```json
{
  "matches": [
    {
      "id": 1,
      "mov_extracto": {...},
      "mov_sistema": {...},
      "estado": "EXACTO",
      "score_total": 0.98,
      "score_fecha": 1.0,
      "score_valor": 1.0,
      "score_descripcion": 0.95,
      "es_traslado": false,
      "confirmado_por_usuario": false
    }
  ],
  "estadisticas": {
    "total_extracto": 102,
    "total_sistema": 76,
    "exactos": 65,
    "probables": 8,
    "sin_match": 29,
    "traslados": 3,
    "ignorados": 0
  }
}
```

---

#### Endpoint 2: `POST /api/matching/vincular`

**Propósito**: Vincular manualmente un movimiento del extracto con uno del sistema

**Request**:
```json
{
  "movimiento_extracto_id": 123,
  "movimiento_id": 456,
  "usuario": "admin",
  "notas": "Vinculación manual - mismo concepto"
}
```

**Proceso**:
1. Validar que existan ambos movimientos (404 si no existen)
2. Obtener configuración para calcular scores
3. Calcular scores de similitud (para auditoría)
4. Crear vinculación con estado `MANUAL`
5. Marcar como confirmado por usuario
6. Guardar y retornar vinculación creada

**Uso**: Cuando el usuario identifica manualmente que dos movimientos corresponden al mismo evento.

---

#### Endpoint 3: `POST /api/matching/desvincular`

**Propósito**: Eliminar una vinculación existente

**Request**:
```json
{
  "movimiento_extracto_id": 123
}
```

**Funcionalidad**:
- Busca y elimina la vinculación asociada al movimiento del extracto
- Lanza error 404 si no existe vinculación
- Retorna confirmación de eliminación

**Uso**: Cuando el usuario decide deshacer una vinculación automática o manual incorrecta.

---

#### Endpoint 4: `POST /api/matching/ignorar`

**Propósito**: Marcar un movimiento del extracto como ignorado

**Request**:
```json
{
  "movimiento_extracto_id": 123,
  "usuario": "admin",
  "razon": "Movimiento duplicado en extracto"
}
```

**Funcionalidad**:
- Crea vinculación con estado `IGNORADO`
- `mov_sistema = None` (no se vincula con nada)
- Guarda razón en notas para auditoría
- Marca como confirmado por usuario

**Uso**: Para movimientos duplicados o irrelevantes que no deben vincularse con el sistema.

---

#### Endpoint 5: `GET /api/matching/configuracion`

**Propósito**: Obtener la configuración activa del algoritmo

**Response**:
```json
{
  "id": 1,
  "tolerancia_valor": 100.00,
  "similitud_descripcion_minima": 0.75,
  "peso_fecha": 0.40,
  "peso_valor": 0.40,
  "peso_descripcion": 0.20,
  "score_minimo_exacto": 0.95,
  "score_minimo_probable": 0.70,
  "palabras_clave_traslado": [
    "TRANSFERENCIA",
    "TRASLADO",
    "CTA",
    "VIRTUAL",
    "FONDO",
    "INVERSION"
  ],
  "activo": true,
  "created_at": "2026-01-18T10:00:00",
  "updated_at": "2026-01-18T10:00:00"
}
```

**Uso**: Para que el frontend muestre la configuración actual y permita ajustes.

---

#### Endpoint 6: `PUT /api/matching/configuracion`

**Propósito**: Actualizar la configuración del algoritmo

**Request**: Mismo formato que GET response (sin id, created_at, updated_at, activo)

**Validaciones automáticas** (en modelo de dominio):
- ✅ Pesos suman 1.00 (con tolerancia de 0.01)
- ✅ Scores entre 0.00 y 1.00
- ✅ `score_exacto >= score_probable`
- ✅ `tolerancia_valor` positiva

**Proceso**:
1. Obtener configuración activa
2. Actualizar valores con los del request
3. Validar (automático en `__post_init__`)
4. Guardar en BD
5. Retornar configuración actualizada

**Uso**: Permite ajustar parámetros del algoritmo sin modificar código.

---

## Schemas Pydantic

Se crearon 7 schemas para validación y serialización:

1. **MovimientoMatchResponse** - Response de una vinculación individual
2. **MatchingResultResponse** - Response del matching completo con estadísticas
3. **VincularRequest** - Request para vincular manualmente
4. **DesvincularRequest** - Request para desvincular
5. **IgnorarRequest** - Request para ignorar movimiento
6. **ConfiguracionMatchingResponse** - Response de configuración
7. **ConfiguracionMatchingUpdate** - Request para actualizar configuración

---

## Funciones Helper

### Conversión de Modelos a Diccionarios

```python
def _movimiento_extracto_to_dict(mov) -> dict
def _movimiento_sistema_to_dict(mov) -> dict
def _match_to_response(match: MovimientoMatch) -> MovimientoMatchResponse
```

**Propósito**: Convertir objetos de dominio a diccionarios JSON-serializables.

**Características**:
- Conversión automática `Decimal` → `float`
- Manejo de valores `None`
- Inclusión de nombres de relaciones (tercero, centro costo, concepto)

---

## Modificaciones en Archivos Existentes

### [dependencies.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/dependencies.py)

**Agregado**:
```python
# Imports
from src.infrastructure.database.postgres_movimiento_vinculacion_repository import PostgresMovimientoVinculacionRepository
from src.domain.ports.movimiento_vinculacion_repository import MovimientoVinculacionRepository
from src.infrastructure.database.postgres_configuracion_matching_repository import PostgresConfiguracionMatchingRepository
from src.domain.ports.configuracion_matching_repository import ConfiguracionMatchingRepository
from src.domain.services.matching_service import MatchingService

# Funciones de inyección
def get_movimiento_vinculacion_repository(conn=Depends(get_db_connection)) -> MovimientoVinculacionRepository:
    return PostgresMovimientoVinculacionRepository(conn)

def get_configuracion_matching_repository(conn=Depends(get_db_connection)) -> ConfiguracionMatchingRepository:
    return PostgresConfiguracionMatchingRepository(conn)

def get_matching_service(
    vinculacion_repo: MovimientoVinculacionRepository = Depends(get_movimiento_vinculacion_repository),
    config_repo: ConfiguracionMatchingRepository = Depends(get_configuracion_matching_repository)
) -> MatchingService:
    return MatchingService(vinculacion_repo, config_repo)
```

---

### [main.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/main.py)

**Agregado**:
```python
# Import
from src.infrastructure.api.routers import matching

# Registro
app.include_router(matching.router)
```

---

## Arquitectura Hexagonal

### ✅ Separación de Responsabilidades

- **Dominio**: Define contratos (puertos) y lógica de negocio
- **Infraestructura**: Implementa adaptadores para PostgreSQL y FastAPI
- **Sin dependencias inversas**: El dominio NO conoce detalles de infraestructura

### ✅ Patrón Repository

- Abstrae el acceso a datos
- Permite cambiar de PostgreSQL a otra BD sin afectar el dominio
- Centraliza queries SQL en repositorios

### ✅ Inyección de Dependencias

- FastAPI maneja la inyección automáticamente
- Facilita testing con mocks
- Desacopla componentes

---

## Validación y Testing

### ✅ Compilación Exitosa

```bash
python -m py_compile postgres_movimiento_vinculacion_repository.py
python -m py_compile postgres_configuracion_matching_repository.py
python -m py_compile matching.py
python -m py_compile dependencies.py
```

**Resultado**: Sin errores de sintaxis en ningún archivo.

---

### ✅ Endpoints Disponibles

Todos los endpoints están registrados y disponibles en la documentación automática de FastAPI:

**URL**: `http://localhost:8000/docs`

**Endpoints verificados**:
- ✅ `GET /api/matching/{cuenta_id}/{year}/{month}`
- ✅ `POST /api/matching/vincular`
- ✅ `POST /api/matching/desvincular`
- ✅ `POST /api/matching/ignorar`
- ✅ `GET /api/matching/configuracion`
- ✅ `PUT /api/matching/configuracion`

---

## Manejo de Errores

### Códigos HTTP Utilizados

- **200 OK**: Operación exitosa
- **400 Bad Request**: Validación fallida (pesos no suman 1.00, scores inválidos, etc.)
- **404 Not Found**: Recurso no encontrado (movimiento, vinculación, configuración)
- **500 Internal Server Error**: Error inesperado del servidor

### Logging

Todas las operaciones importantes se registran:
```python
logger.info(f"Ejecutando matching para cuenta {cuenta_id}, periodo {year}/{month}")
logger.info(f"Vinculación manual guardada con ID {match_guardado.id}")
logger.error(f"Error ejecutando matching: {e}", exc_info=True)
```

---

## Características Técnicas

### Conversión de Tipos

- **Decimal ↔ float**: Para compatibilidad JSON
- **date ↔ string**: Formato ISO 8601
- **Enum ↔ string**: Estados de matching
- **TEXT[] ↔ List[str]**: Arrays PostgreSQL

### Transacciones

Todos los métodos que modifican datos:
```python
try:
    # Operación
    self.conn.commit()
    return resultado
except Exception as e:
    self.conn.rollback()
    raise e
```

### Performance

- Queries optimizados con índices
- JOINs eficientes para obtener datos relacionados
- Ordenamiento por fecha y valor para mejor UX
- Carga lazy de relaciones cuando es necesario

---

## Próximos Pasos

### Fase 4: Frontend - Atomic Design

**Pendiente**:
- Crear componentes atómicos (`MatchStatusBadge`, `ScoreIndicator`)
- Crear moléculas (`MovimientoExtractoCard`, `MovimientoSistemaCard`)
- Crear organismos (`DualPanelComparison`, `MatchingStatsCard`)
- Crear página (`ConciliacionMatchingPage`)

### Fase 5: Funcionalidades de Usuario

**Pendiente**:
- Implementar acciones: Vincular, Desvincular, Ignorar
- Implementar creación de movimiento desde extracto
- Implementar detección de traslados entre cuentas
- Agregar filtros por estado de matching

---

## Resumen de Logros

### ✅ Repositorios PostgreSQL
- 2 repositorios implementados
- 13 métodos en total
- Cobertura completa de puertos del dominio

### ✅ API REST
- 6 endpoints implementados
- 7 schemas Pydantic para validación
- Documentación automática con Swagger
- Manejo robusto de errores

### ✅ Integración
- Dependency injection configurada
- Router registrado en aplicación
- Logging implementado
- Validaciones en múltiples capas

---

## Conclusión

La **Fase 3: Backend - Infraestructura** se completó exitosamente. El sistema ahora cuenta con una API REST completa para ejecutar el algoritmo de matching y gestionar las vinculaciones entre movimientos del extracto bancario y del sistema.

**Estado del proyecto**:
- ✅ Fase 1: Base de Datos y Configuración
- ✅ Fase 2: Backend - Dominio (Hexagonal)
- ✅ Fase 3: Backend - Infraestructura
- ⏳ Fase 4: Frontend - Atomic Design
- ⏳ Fase 5: Funcionalidades de Usuario
- ⏳ Fase 6: Testing y Refinamiento

El backend está listo para ser consumido por el frontend y puede ser probado inmediatamente usando la interfaz Swagger en `/docs`.
