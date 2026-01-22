# Implementation Plan: Sistema de Matching de Conciliación

## Objetivo

Implementar un sistema inteligente de matching entre movimientos del extracto bancario y movimientos del sistema, con parámetros configurables, auditoría completa, y una interfaz de dos paneles que permita al usuario identificar y resolver diferencias.

---

## User Review Required

> [!IMPORTANT]
> **Arquitectura y Patrones**
> - Backend: Arquitectura Hexagonal (Dominio → Puertos → Adaptadores)
> - Frontend: Atomic Design (Atoms → Molecules → Organisms → Pages)
> - Look & Feel: Mantener consistencia con diseño actual (colores, tipografía, componentes)

> [!IMPORTANT]
> **Parámetros Configurables Acordados**
> - Tolerancia de valor: $100 COP (configurable vía BD)
> - Similitud de descripción: 75% (configurable vía BD)
> - Auto-vinculación: Solo para matches EXACTOS (score ≥ 95%)
> - Campo referencia: Útil para sistema, pero vacío en extractos Bancolombia

> [!WARNING]
> **Scripts SQL Manuales**
> - Los scripts SQL se crean pero NO se ejecutan automáticamente
> - El usuario los ejecutará manualmente para mayor control
> - Archivos creados en `/Sql/CreateTable_*.sql`

---

## Proposed Changes

### Backend - Arquitectura Hexagonal

#### Domain Layer (Dominio)

##### [NEW] [movimiento_match.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/domain/models/movimiento_match.py)

Modelo de dominio para representar un match entre extracto y sistema:

```python
@dataclass
class MovimientoMatch:
    """Representa el resultado de matching entre extracto y sistema"""
    mov_extracto: MovimientoExtracto
    mov_sistema: Optional[Movimiento]
    estado: MatchEstado  # EXACTO, PROBABLE, MANUAL, TRASLADO, SIN_MATCH, IGNORADO
    score_total: Decimal
    score_fecha: Decimal
    score_valor: Decimal
    score_descripcion: Decimal
    es_traslado: bool
    cuenta_contraparte_id: Optional[int]
```

##### [NEW] [configuracion_matching.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/domain/models/configuracion_matching.py)

Modelo de dominio para configuración:

```python
@dataclass
class ConfiguracionMatching:
    """Parámetros configurables del algoritmo de matching"""
    tolerancia_valor: Decimal
    similitud_descripcion_minima: Decimal
    peso_fecha: Decimal
    peso_valor: Decimal
    peso_descripcion: Decimal
    score_minimo_exacto: Decimal
    score_minimo_probable: Decimal
    palabras_clave_traslado: List[str]
```

##### [NEW] [matching_service.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/domain/services/matching_service.py)

Servicio de dominio con la lógica del algoritmo:

```python
class MatchingService:
    """Servicio de dominio para matching de movimientos"""
    
    def ejecutar_matching(
        self,
        movs_extracto: List[MovimientoExtracto],
        movs_sistema: List[Movimiento],
        config: ConfiguracionMatching
    ) -> List[MovimientoMatch]:
        """Ejecuta el algoritmo de matching completo"""
        
    def calcular_score_fecha(self, fecha1: date, fecha2: date) -> Decimal:
        """Retorna 1.0 si coinciden, 0.0 si no"""
        
    def calcular_score_valor(self, valor1: Decimal, valor2: Decimal, tolerancia: Decimal) -> Decimal:
        """Retorna score basado en diferencia vs tolerancia"""
        
    def calcular_score_descripcion(self, desc1: str, desc2: str) -> Decimal:
        """Usa algoritmo de similitud de texto (Levenshtein o similar)"""
        
    def detectar_traslado(self, mov: MovimientoExtracto, config: ConfiguracionMatching) -> bool:
        """Detecta si es un traslado por palabras clave"""
```

---

#### Ports Layer (Puertos)

##### [NEW] [movimiento_vinculacion_repository.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/domain/ports/movimiento_vinculacion_repository.py)

```python
class MovimientoVinculacionRepository(ABC):
    @abstractmethod
    def guardar(self, vinculacion: MovimientoMatch) -> MovimientoMatch:
        pass
    
    @abstractmethod
    def obtener_por_periodo(self, cuenta_id: int, year: int, month: int) -> List[MovimientoMatch]:
        pass
    
    @abstractmethod
    def desvincular(self, movimiento_extracto_id: int) -> None:
        pass
```

##### [NEW] [configuracion_matching_repository.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/domain/ports/configuracion_matching_repository.py)

```python
class ConfiguracionMatchingRepository(ABC):
    @abstractmethod
    def obtener_activa(self) -> ConfiguracionMatching:
        pass
    
    @abstractmethod
    def actualizar(self, config: ConfiguracionMatching) -> ConfiguracionMatching:
        pass
```

---

#### Infrastructure Layer (Adaptadores)

##### [NEW] [postgres_movimiento_vinculacion_repository.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/database/postgres_movimiento_vinculacion_repository.py)

Implementación PostgreSQL del repositorio de vinculaciones.

##### [NEW] [postgres_configuracion_matching_repository.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/database/postgres_configuracion_matching_repository.py)

Implementación PostgreSQL del repositorio de configuración.

##### [NEW] [matching.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/routers/matching.py)

Nuevo router para endpoints de matching:

**Endpoints**:
- `GET /api/matching/{cuenta_id}/{year}/{month}` - Ejecuta matching y retorna resultados
- `POST /api/matching/vincular` - Vincula manualmente extracto con sistema
- `POST /api/matching/desvincular` - Elimina vinculación
- `POST /api/matching/ignorar` - Marca movimiento como ignorado
- `GET /api/matching/configuracion` - Obtiene configuración actual
- `PUT /api/matching/configuracion` - Actualiza configuración

---

### Frontend - Atomic Design

#### Atoms (Componentes Básicos)

##### [NEW] [MatchStatusBadge.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/atoms/MatchStatusBadge.tsx)

Badge visual para estados de matching:

```tsx
interface MatchStatusBadgeProps {
  status: 'EXACTO' | 'PROBABLE' | 'MANUAL' | 'TRASLADO' | 'SIN_MATCH' | 'IGNORADO';
  size?: 'sm' | 'md' | 'lg';
}

// Colores según estado:
// EXACTO: Verde (bg-green-100 text-green-700)
// PROBABLE: Amarillo (bg-yellow-100 text-yellow-700)
// TRASLADO: Azul (bg-blue-100 text-blue-700)
// SIN_MATCH: Rojo (bg-red-100 text-red-700)
// MANUAL: Verde claro (bg-emerald-100 text-emerald-700)
// IGNORADO: Gris (bg-gray-100 text-gray-500)
```

##### [NEW] [ScoreIndicator.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/atoms/ScoreIndicator.tsx)

Indicador visual del score de similitud (barra de progreso circular o lineal).

---

#### Molecules (Componentes Compuestos)

##### [NEW] [MovimientoExtractoCard.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/molecules/MovimientoExtractoCard.tsx)

Tarjeta para mostrar un movimiento del extracto:

```tsx
interface MovimientoExtractoCardProps {
  movimiento: MovimientoExtracto;
  matchStatus: MatchStatus;
  score?: number;
  onVincular?: () => void;
  onIgnorar?: () => void;
  onCrear?: () => void;
  selected?: boolean;
}

// Muestra: fecha, descripción, valor, USD (si aplica), estado badge
```

##### [NEW] [MovimientoSistemaCard.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/molecules/MovimientoSistemaCard.tsx)

Tarjeta para mostrar un movimiento del sistema:

```tsx
interface MovimientoSistemaCardProps {
  movimiento: Movimiento;
  matchStatus?: MatchStatus;
  onDesvincular?: () => void;
  selected?: boolean;
}

// Muestra: fecha, descripción, valor, tercero, centro costo, concepto
```

##### [NEW] [MatchConnectionLine.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/molecules/MatchConnectionLine.tsx)

Línea visual SVG que conecta movimientos vinculados entre paneles.

---

#### Organisms (Componentes Complejos)

##### [NEW] [DualPanelComparison.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/organisms/DualPanelComparison.tsx)

Componente principal de dos paneles:

```tsx
interface DualPanelComparisonProps {
  cuentaId: number;
  year: number;
  month: number;
}

// Layout:
// - Header con estadísticas de matching
// - Filtros por estado
// - Dos columnas scrollables independientes
// - Panel izquierdo: Extracto
// - Panel derecho: Sistema
// - Líneas de conexión entre matches
```

##### [NEW] [MatchingStatsCard.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/organisms/MatchingStatsCard.tsx)

Card de estadísticas del matching (similar al actual pero con desglose por estado).

---

#### Pages

##### [MODIFY] [ConciliacionPage.tsx](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/pages/ConciliacionPage.tsx)

Modificar para agregar nueva vista de matching:

- Agregar botón "Ver Matching Detallado" en la vista de detalle
- Renderizar `DualPanelComparison` cuando se active modo matching

---

### Database Scripts

##### [NEW] [CreateTable_configuracion_matching.sql](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Sql/CreateTable_configuracion_matching.sql)

✅ Ya creado - Tabla de configuración con valores por defecto.

##### [NEW] [CreateTable_movimiento_vinculaciones.sql](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Sql/CreateTable_movimiento_vinculaciones.sql)

✅ Ya creado - Tabla de auditoría de vinculaciones.

---

## Verification Plan

### Automated Tests

No existen tests automatizados actualmente en el proyecto. Se propone:

1. **Test del Algoritmo de Matching** (opcional para futuro):
   ```bash
   # Crear test unitario en Backend/tests/test_matching_service.py
   pytest Backend/tests/test_matching_service.py -v
   ```

### Manual Verification

#### Fase 1: Verificación de Base de Datos

1. **Ejecutar scripts SQL manualmente**:
   ```sql
   -- En tu cliente PostgreSQL:
   \i Sql/CreateTable_configuracion_matching.sql
   \i Sql/CreateTable_movimiento_vinculaciones.sql
   ```

2. **Verificar tablas creadas**:
   ```sql
   SELECT * FROM configuracion_matching;
   SELECT COUNT(*) FROM movimiento_vinculaciones;
   ```

#### Fase 2: Verificación de Backend

1. **Iniciar aplicación**:
   ```powershell
   . .\arranque_app.ps1
   ```

2. **Probar endpoint de configuración**:
   - Abrir navegador en `http://localhost:8000/docs`
   - Ejecutar `GET /api/matching/configuracion`
   - Verificar que retorna la configuración por defecto

3. **Probar endpoint de matching**:
   - Ejecutar `GET /api/matching/1/2025/12` (Ahorros, Diciembre 2025)
   - Verificar que retorna:
     - Lista de matches con estados
     - Estadísticas de coincidencias
     - Scores calculados

#### Fase 3: Verificación de Frontend

1. **Navegar a Conciliación**:
   - Ir a "Conciliación Mensual"
   - Seleccionar Ahorros - Diciembre 2025
   - Click en "Ver Detalle de Movimientos"

2. **Activar Vista de Matching**:
   - Click en nuevo botón "Ver Matching Detallado"
   - Verificar que se muestra vista de dos paneles

3. **Verificar Funcionalidades**:
   - ✅ Panel izquierdo muestra 102 movimientos del extracto
   - ✅ Panel derecho muestra 76 movimientos del sistema
   - ✅ Badges de estado correctamente coloreados
   - ✅ Filtros por estado funcionan
   - ✅ Líneas de conexión entre matches EXACTOS
   - ✅ Acciones de vincular/desvincular/ignorar funcionan

4. **Probar Casos Específicos**:
   - **Match Exacto**: Buscar "TRANSFERENCIA CTA SUC VIRTUAL" con mismo valor
   - **Traslado**: Verificar que detecta traslados a FondoRenta
   - **Sin Match**: Verificar "ABONO INTERESES AHORROS" aparece en rojo
   - **Vincular Manual**: Seleccionar extracto sin match y vincularlo manualmente

#### Fase 4: Verificación de Auditoría

1. **Verificar tabla de vinculaciones**:
   ```sql
   SELECT 
     v.estado,
     COUNT(*) as cantidad,
     AVG(v.score_similitud) as score_promedio
   FROM movimiento_vinculaciones v
   WHERE v.movimiento_extracto_id IN (
     SELECT id FROM movimientos_extracto 
     WHERE cuenta_id = 1 AND year = 2025 AND month = 12
   )
   GROUP BY v.estado;
   ```

2. **Verificar que se guardan vinculaciones manuales**:
   - Vincular manualmente un movimiento en el frontend
   - Verificar en BD que se creó registro con `estado = 'MANUAL'`
   - Verificar que `confirmado_por_usuario = TRUE`

---

## Implementation Notes

### Algoritmo de Similitud de Texto

Para calcular similitud de descripción, usar **Levenshtein Distance**:

```python
from difflib import SequenceMatcher

def calcular_similitud(texto1: str, texto2: str) -> float:
    """Retorna similitud entre 0.0 y 1.0"""
    return SequenceMatcher(None, texto1.upper(), texto2.upper()).ratio()
```

### Detección de Traslados

Buscar en todas las cuentas del mismo periodo:

```python
def buscar_contraparte_traslado(
    mov_extracto: MovimientoExtracto,
    todas_cuentas: List[int],
    repo: MovimientoRepository
) -> Optional[Tuple[int, Movimiento]]:
    """Busca el otro lado del traslado en otras cuentas"""
    valor_buscado = -mov_extracto.valor  # Signo opuesto
    
    for cuenta_id in todas_cuentas:
        if cuenta_id == mov_extracto.cuenta_id:
            continue
            
        movs = repo.buscar_por_fecha_valor(
            cuenta_id=cuenta_id,
            fecha=mov_extracto.fecha,
            valor_min=valor_buscado - 100,
            valor_max=valor_buscado + 100
        )
        
        if movs:
            return (cuenta_id, movs[0])
    
    return None
```

### Performance Optimization

Para periodos con muchos movimientos (>500), implementar:

1. **Indexación por fecha**: Comparar solo movimientos del mismo día
2. **Caching**: Cachear configuración de matching
3. **Paginación**: Cargar movimientos en chunks de 100

---

## Rollback Plan

Si algo falla:

1. **Base de Datos**: Las tablas nuevas no afectan funcionalidad existente
2. **Backend**: Los nuevos endpoints son independientes
3. **Frontend**: La vista actual sigue funcionando, nueva vista es opcional

Para revertir:
```sql
DROP TABLE IF EXISTS movimiento_vinculaciones CASCADE;
DROP TABLE IF EXISTS configuracion_matching CASCADE;
```

---

## Next Steps After Approval

1. ✅ Ejecutar scripts SQL manualmente
2. ✅ Implementar capa de dominio (modelos y servicios)
3. ✅ Implementar puertos y adaptadores
4. ✅ Crear endpoints de API
5. ✅ Implementar componentes frontend (atoms → molecules → organisms)
6. ✅ Integrar en página de conciliación
7. ✅ Verificar manualmente con datos reales
8. ✅ Ajustar algoritmo según resultados
