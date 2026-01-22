# Sistema de Movimientos de Extracto

Sistema dual para comparar movimientos registrados en el sistema vs movimientos extraídos de PDFs de extractos bancarios.

## User Review Required

> [!IMPORTANT]
> **Asignación de `cuenta_id`**: El `cuenta_id` se asigna desde el frontend cuando el usuario selecciona la cuenta al cargar el extracto. Los extractores NO conocen el `cuenta_id`, solo extraen datos del PDF. Esta separación mantiene los extractores independientes del contexto de la aplicación.

> [!IMPORTANT]
> **Estadísticas en Página de Carga**: Se añadirá una visualización de estadísticas después de cargar un extracto, mostrando:
> - Total de movimientos extraídos del PDF
> - Total de ingresos del periodo
> - Total de egresos del periodo
> - Saldo neto del periodo
> 
> Similar a la implementación existente en `UploadMovimientosPage.tsx`.

## Proposed Changes

### Backend - Infraestructura

#### [NEW] [create_movimientos_extracto_table.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Scripts/create_movimientos_extracto_table.py)

Script para crear tabla `movimientos_extracto`:
- **Columnas principales**: `cuenta_id`, `year`, `month`, `fecha`, `descripcion`, `referencia`, `valor`
- **Metadata**: `numero_linea`, `raw_text` (para debugging)
- **FK**: Referencias a `cuentas(cuentaid)` y `conciliaciones(cuenta_id, year, month)`
- **Índices**: Por cuenta/periodo, fecha, valor, referencia

---

#### [NEW] [movimiento_extracto.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/domain/models/movimiento_extracto.py)

Modelo de dominio:
- Dataclass con todos los campos de la tabla
- Campo `cuenta` (join) para nombre de cuenta
- No incluye lógica de negocio, solo estructura de datos

#### [NEW] [movimiento_extracto_repository.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/domain/ports/movimiento_extracto_repository.py)

Port (interface) del repositorio:
- `guardar()` - guardar un movimiento
- `guardar_lote()` - guardar múltiples movimientos (batch)
- `obtener_por_periodo()` - obtener todos los movimientos de un periodo
- `eliminar_por_periodo()` - limpiar periodo antes de recargar
- `obtener_por_id()` - obtener un movimiento específico
- `contar_por_periodo()` - contar movimientos de un periodo

#### [NEW] [postgres_movimiento_extracto_repository.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/database/postgres_movimiento_extracto_repository.py)

Implementación PostgreSQL del repositorio:
- Implementa todos los métodos del port
- Usa JOIN con tabla `cuentas` para obtener nombre
- `executemany()` para inserción batch eficiente
- Ordenamiento por fecha y numero_linea

---

### Backend - Extractores

#### [NEW] [ahorros_extracto_movimientos.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/bancolombia/ahorros_extracto_movimientos.py)

Extractor de movimientos para Cuenta de Ahorros:
- Lee PDF con `pdfplumber`
- Regex para identificar líneas de movimientos
- Parsea: fecha, descripción, referencia, débito/crédito
- Retorna lista de diccionarios SIN `cuenta_id`
- Soporta formato colombiano (1.234.567,89) y US (1,234,567.89)

**Formato esperado del PDF**:
```
FECHA       DESCRIPCIÓN              REFERENCIA    DÉBITO      CRÉDITO     SALDO
01/12/2025  COMPRA DATAFONOS        123456789                  150,000     1,500,000
05/12/2025  RETIRO CAJERO           987654321     200,000                 1,300,000
```

#### [NEW] [fondorenta_extracto_movimientos.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/bancolombia/fondorenta_extracto_movimientos.py)

Extractor de movimientos para FondoRenta:
- Estructura similar a ahorros
- Regex ajustado según formato de FondoRenta
- **NOTA**: Template inicial, debe ajustarse con PDF real

#### [NEW] [mastercard_pesos_extracto_movimientos.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/bancolombia/mastercard_pesos_extracto_movimientos.py)

Adaptador para MasterCard Pesos:
- Usa el extractor existente `mastercard_pesos_movimientos.py`
- Adapta formato de salida para ser compatible con `movimientos_extracto`
- No duplica lógica, solo transforma estructura

#### [NEW] [mastercard_usd_extracto_movimientos.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/extractors/bancolombia/mastercard_usd_extracto_movimientos.py)

Adaptador para MasterCard USD:
- Usa el extractor existente `mastercard_usd_movimientos.py`
- Adapta formato de salida para compatibilidad

---

### Backend - Servicios y API

#### [MODIFY] [dependencies.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/dependencies.py)

Añadir función `get_movimiento_extracto_repository()` para dependency injection.

#### [MODIFY] [procesador_archivos_service.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/application/services/procesador_archivos_service.py)

Actualizar método `procesar_extracto()`:
1. Extraer resumen (código existente)
2. **NUEVO**: Extraer movimientos individuales
3. Crear objetos `MovimientoExtracto` asignando `cuenta_id` del parámetro
4. Eliminar movimientos anteriores del periodo
5. Guardar movimientos en batch
6. Retornar count de movimientos extraídos

Añadir método `_obtener_modulo_extractor_movimientos()`:
- Mapea `cuenta_id` a módulo extractor correspondiente
- Retorna el módulo o `None` si no existe

#### [MODIFY] [conciliaciones.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/routers/conciliaciones.py)

Añadir dos nuevos endpoints:

**`GET /api/conciliaciones/{cuenta_id}/{year}/{month}/movimientos-extracto`**
- Retorna movimientos extraídos del PDF del extracto
- Lista completa con fecha, descripción, referencia, valor

**`GET /api/conciliaciones/{cuenta_id}/{year}/{month}/comparacion`**
- Compara movimientos del sistema vs extracto
- Retorna estadísticas de ambas fuentes
- Calcula diferencias en cantidad, ingresos, egresos, saldo neto

---

### Frontend - Página de Carga de Extracto

#### [MODIFY] [UploadExtractoPage.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/pages/UploadExtractoPage.tsx)

Actualizar para mostrar estadísticas después de cargar extracto:

1. **Estado para estadísticas**:
```typescript
const [showStatsModal, setShowStatsModal] = useState(false)
const [uploadStats, setUploadStats] = useState<{
  resumen: {
    saldo_anterior: number
    entradas: number
    salidas: number
    saldo_final: number
    year: number
    month: number
    periodo_texto: string
  }
  movimientos_count: number
} | null>(null)
```

2. **Modal de estadísticas** (usando componente `Modal` existente):
```typescript
<Modal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)}>
  <h2>✅ Extracto Cargado Exitosamente</h2>
  
  <div>Periodo: {uploadStats.resumen.periodo_texto}</div>
  <div>Movimientos Extraídos: {uploadStats.movimientos_count}</div>
  
  <div>Saldo Anterior: ${uploadStats.resumen.saldo_anterior}</div>
  <div>Entradas: ${uploadStats.resumen.entradas}</div>
  <div>Salidas: ${uploadStats.resumen.salidas}</div>
  <div>Saldo Final: ${uploadStats.resumen.saldo_final}</div>
</Modal>
```

3. **Actualizar handler de upload**:
- Capturar respuesta del backend con estadísticas
- Guardar en estado `uploadStats`
- Mostrar modal automáticamente

---

### Frontend - Página de Conciliación

#### [MODIFY] [ConciliacionPage.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/pages/ConciliacionPage.tsx)

Añadir nuevo tab "Detalle Movimientos":

1. **Tabs adicionales**:
```typescript
const [activeTab, setActiveTab] = useState<'resumen' | 'movimientos'>('resumen')
```

2. **Nuevo componente de comparación**:
- Tabla lado a lado: Sistema | Extracto
- Resaltar diferencias
- Indicador visual de movimientos faltantes
- Filtros por fecha, tipo (ingreso/egreso)

3. **API call para comparación**:
```typescript
const fetchComparacion = async () => {
  const data = await conciliacionService.compararMovimientos(
    cuentaId, year, month
  )
  // Mostrar en interfaz
}
```

---

### Frontend - Servicios

#### [MODIFY] [conciliacionService.ts](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/frontend/src/services/conciliacionService.ts)

Añadir métodos:

```typescript
obtenerMovimientosExtracto(cuentaId: number, year: number, month: number)

compararMovimientos(cuentaId: number, year: number, month: number)
```

#### [NEW] Tipo TypeScript para MovimientoExtracto

```typescript
export interface MovimientoExtracto {
  id: number
  cuenta_id: number
  year: number
  month: number
  fecha: string
  descripcion: string
  referencia: string | null
  valor: number
  numero_linea: number | null
  cuenta: string
}
```

---

## Verification Plan

### Automated Tests

```bash
# 1. Crear tabla
cd Scripts
python create_movimientos_extracto_table.py

# 2. Verificar que tabla existe en PostgreSQL
# Conectar a BD y verificar estructura

# 3. Probar extractor (unit test manual)
python -c "
from Backend.src.infrastructure.extractors.bancolombia import ahorros_extracto_movimientos
movs = ahorros_extracto_movimientos.extraer_movimientos(open('extracto.pdf', 'rb'))
print(f'Extraídos {len(movs)} movimientos')
"

# 4. Restart backend
# Verificar logs al cargar extracto

# 5. Test API endpoints
curl http://localhost:8000/api/conciliaciones/1/2025/12/movimientos-extracto
curl http://localhost:8000/api/conciliaciones/1/2025/12/comparacion
```

### Manual Verification

1. **Cargar extracto de Ahorros de diciembre 2025**:
   - Ir a "Cargar Extracto Bancario"
   - Seleccionar cuenta "Ahorros"
   - Upload PDF
   - ✅ Verificar que aparece modal con estadísticas
   - ✅ Verificar que muestra count de movimientos extraídos

2. **Verificar en Base de Datos**:
   ```sql
   SELECT COUNT(*) FROM movimientos_extracto 
   WHERE cuenta_id = 1 AND year = 2025 AND month = 12;
   
   -- Debe coincidir con el count mostrado en el modal
   ```

3. **Página de Conciliación**:
   - Ir a "Conciliación Mensual"
   - Filtrar Ahorros, Diciembre 2025
   - Click en tab "Detalle Movimientos"
   - ✅ Verificar tabla de comparación
   - ✅ Verificar que muestra diferencias correctamente

4. **Comparar números con tu caso de diciembre**:
   - Sistema: 17 movimientos, $17.579.117 ingresos, $12.597.923 egresos
   - Extracto: Debe mostrar ~156 movimientos (según tu imagen)
   - Diferencia: ~139 movimientos faltantes

---

## Orden de Implementación Sugerido

### Fase 1: Infraestructura (Día 1)
1. Crear tabla
2. Crear modelos de dominio
3. Crear repositories
4. Añadir dependency injection

### Fase 2: Extractor de Ahorros (Día 1)
5. Crear `ahorros_extracto_movimientos.py`
6. Probar con tu PDF de diciembre
7. Ajustar regex según necesidad

### Fase 3: Integración Backend (Día 2)
8. Actualizar `procesador_archivos_service.py`
9. Actualizar endpoints API
10. Probar carga completa

### Fase 4: Frontend - Estadísticas (Día 2)
11. Actualizar `UploadExtractoPage.tsx`
12. Implementar modal de estadísticas
13. Probar flujo completo de carga

### Fase 5: Frontend - Comparación (Día 3)
14. Actualizar `ConciliacionPage.tsx`
15. Crear componente de comparación
16. Verificar con datos reales

### Fase 6: Otros Extractores (Día 3)
17. Implementar extractores de FondoRenta, MasterCard
18. Probar con PDFs reales
