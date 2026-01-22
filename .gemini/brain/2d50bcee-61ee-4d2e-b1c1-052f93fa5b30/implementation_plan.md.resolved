# Fase 4: Servicio de Matching y Lógica de Vinculación

Esta fase implementa el servicio de dominio que contiene toda la lógica de negocio para el matching inteligente de movimientos y la gestión de vinculaciones.

## Objetivo de la Fase 4

Crear el servicio `MatchingService` que:
1. **Obtiene candidatos de matching** entre movimientos de extracto y sistema
2. **Calcula scores de similitud** usando múltiples criterios configurables
3. **Gestiona vinculaciones** (crear, eliminar, validar)
4. **Maneja movimientos ignorados** para excluirlos del matching
5. **Aplica configuración** de matching activa

## Propuesta de Implementación

### Backend - Servicio de Dominio

#### [NEW] [matching_service.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/domain/services/matching_service.py)

**Responsabilidades:**
- Obtener movimientos candidatos para matching (extracto vs sistema)
- Calcular scores de similitud basados en:
  - Diferencia de fechas (tolerancia configurable)
  - Similitud de montos (tolerancia configurable)
  - Similitud de descripciones (usando algoritmo de Levenshtein)
  - Ponderación configurable de cada criterio
- Crear/eliminar vinculaciones entre movimientos
- Marcar movimientos como ignorados
- Validar reglas de negocio:
  - Un movimiento de extracto solo puede vincularse a un movimiento de sistema
  - Un movimiento de sistema solo puede vincularse a un movimiento de extracto
  - No se pueden vincular movimientos ya vinculados
  - No se pueden vincular movimientos ignorados

**Métodos principales:**
```python
class MatchingService:
    async def obtener_candidatos_matching(
        self, 
        cuenta_id: int, 
        year: int, 
        month: int
    ) -> List[MovimientoMatch]
    
    async def vincular_movimientos(
        self,
        movimiento_extracto_id: int,
        movimiento_sistema_id: int,
        usuario_id: int
    ) -> MovimientoVinculacion
    
    async def desvincular_movimientos(
        self,
        vinculacion_id: int,
        usuario_id: int
    ) -> None
    
    async def marcar_como_ignorado(
        self,
        movimiento_id: int,
        tipo_movimiento: str,  # 'extracto' o 'sistema'
        usuario_id: int
    ) -> None
    
    async def calcular_score_similitud(
        self,
        mov_extracto: MovimientoExtracto,
        mov_sistema: Movimiento,
        config: ConfiguracionMatching
    ) -> float
```

**Algoritmo de Matching:**

1. **Obtener movimientos no vinculados:**
   - Movimientos de extracto sin vinculación
   - Movimientos de sistema sin vinculación
   - Excluir movimientos marcados como ignorados

2. **Para cada movimiento de extracto:**
   - Buscar movimientos de sistema candidatos
   - Filtrar por rango de fechas (± días de tolerancia)
   - Filtrar por rango de montos (± porcentaje de tolerancia)
   
3. **Calcular score para cada par:**
   ```
   score = (peso_fecha × score_fecha) + 
           (peso_monto × score_monto) + 
           (peso_descripcion × score_descripcion)
   ```
   
   Donde:
   - `score_fecha = 1 - (días_diferencia / días_tolerancia)`
   - `score_monto = 1 - (diferencia_monto / (monto × tolerancia_porcentaje))`
   - `score_descripcion = similitud_levenshtein(desc1, desc2)`

4. **Ordenar candidatos por score** (descendente)

5. **Aplicar umbral mínimo** de score para considerar match válido

**Dependencias:**
- `MovimientoExtractoRepository`: obtener movimientos de extracto
- `MovimientoRepository`: obtener movimientos de sistema
- `MovimientoVinculacionRepository`: gestionar vinculaciones
- `ConfiguracionMatchingRepository`: obtener configuración activa
- Librería `python-Levenshtein` para similitud de textos

## Cambios Adicionales

### [MODIFY] [requirements.txt](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/requirements.txt)

Agregar dependencia para cálculo de similitud de textos:
```
python-Levenshtein==0.25.0
```

### [MODIFY] [matching.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/infrastructure/api/matching.py)

Actualizar los endpoints para usar el nuevo `MatchingService`:
- Inyectar `MatchingService` en los endpoints
- Delegar toda la lógica de negocio al servicio
- Los endpoints solo manejan validación de entrada y respuesta HTTP

## Plan de Verificación

### 1. Pruebas Unitarias del Servicio
- Verificar cálculo de scores con diferentes configuraciones
- Validar reglas de negocio de vinculación
- Probar manejo de casos edge (movimientos duplicados, montos cero, etc.)

### 2. Pruebas de Integración
- Probar flujo completo: obtener candidatos → vincular → desvincular
- Verificar que movimientos ignorados no aparecen en candidatos
- Validar que configuración activa se aplica correctamente

### 3. Pruebas Manuales
- Cargar extracto y movimientos de sistema reales
- Verificar que candidatos sugeridos tienen sentido
- Probar vinculación manual y automática

## Notas Técnicas

> [!IMPORTANT]
> El algoritmo de matching es **sugerencial**, no automático. El servicio proporciona candidatos ordenados por score, pero la decisión final de vincular es del usuario.

> [!NOTE]
> La similitud de Levenshtein se normaliza dividiendo por la longitud del texto más largo, resultando en un valor entre 0 y 1.

> [!WARNING]
> Los pesos de los criterios deben sumar 1.0 (100%). Esto se valida al crear/actualizar la configuración.
