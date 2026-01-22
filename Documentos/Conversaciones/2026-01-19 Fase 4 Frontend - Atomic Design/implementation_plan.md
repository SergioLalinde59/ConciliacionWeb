# Fase 4: Frontend - Atomic Design para Matching Inteligente

## Descripción

Implementar la interfaz de usuario para el sistema de matching inteligente de conciliación bancaria, siguiendo el patrón Atomic Design ya establecido en el proyecto. Esta fase creará componentes reutilizables que permitan visualizar, comparar y gestionar las vinculaciones entre movimientos del extracto bancario y movimientos del sistema.

## Contexto Técnico

### Backend Disponible

El backend ya cuenta con 6 endpoints REST completamente funcionales:

1. **GET** `/api/matching/{cuenta_id}/{year}/{month}` - Ejecutar matching y obtener resultados
2. **POST** `/api/matching/vincular` - Vincular manualmente dos movimientos
3. **POST** `/api/matching/desvincular` - Eliminar una vinculación
4. **POST** `/api/matching/ignorar` - Marcar movimiento como ignorado
5. **GET** `/api/matching/configuracion` - Obtener configuración del algoritmo
6. **PUT** `/api/matching/configuracion` - Actualizar configuración

### Estructura de Datos

**MovimientoMatchResponse:**
```typescript
{
  id: number | null
  mov_extracto: MovimientoExtracto
  mov_sistema: Movimiento | null
  estado: 'EXACTO' | 'PROBABLE' | 'SIN_MATCH' | 'MANUAL' | 'IGNORADO'
  score_total: number
  score_fecha: number
  score_valor: number
  score_descripcion: number
  es_traslado: boolean
  cuenta_contraparte_id: number | null
  confirmado_por_usuario: boolean
  created_by: string | null
  notas: string | null
}
```

**MatchingResultResponse:**
```typescript
{
  matches: MovimientoMatchResponse[]
  estadisticas: {
    total_extracto: number
    total_sistema: number
    exactos: number
    probables: number
    sin_match: number
    traslados: number
    ignorados: number
  }
}
```

### Arquitectura Frontend Existente

- **Atomic Design**: Componentes organizados en atoms, molecules, organisms, templates
- **React Query**: Para manejo de estado del servidor
- **TailwindCSS**: Para estilos
- **TypeScript**: Tipado estático
- **Lucide Icons**: Librería de iconos

---

## Cambios Propuestos

### 1. Tipos TypeScript

#### [NEW] [types/Matching.ts](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/types/Matching.ts)

Definir interfaces TypeScript para los datos del matching:
- `MovimientoExtracto` - Movimiento del extracto bancario
- `MovimientoSistema` - Movimiento del sistema
- `MovimientoMatch` - Vinculación entre movimientos
- `MatchingResult` - Resultado completo del matching
- `MatchingEstadisticas` - Estadísticas del matching
- `ConfiguracionMatching` - Configuración del algoritmo
- `MatchEstado` - Enum de estados posibles

---

### 2. Servicio API

#### [NEW] [services/matching.service.ts](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/services/matching.service.ts)

Crear servicio para consumir los endpoints de matching:
- `ejecutarMatching(cuentaId, year, month)` - Ejecutar algoritmo
- `vincularManual(extractoId, sistemaId, usuario, notas)` - Vincular manualmente
- `desvincular(extractoId)` - Eliminar vinculación
- `ignorar(extractoId, usuario, razon)` - Marcar como ignorado
- `obtenerConfiguracion()` - Obtener configuración activa
- `actualizarConfiguracion(config)` - Actualizar configuración

#### [MODIFY] [services/api.ts](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/services/api.ts)

Exportar el nuevo servicio de matching.

---

### 3. Componentes Atómicos (Atoms)

#### [NEW] [components/atoms/MatchStatusBadge.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/atoms/MatchStatusBadge.tsx)

Badge especializado para mostrar el estado del matching:
- **EXACTO**: Verde (emerald) - Match perfecto
- **PROBABLE**: Amarillo (amber) - Match probable
- **SIN_MATCH**: Gris (neutral) - Sin match
- **MANUAL**: Azul (blue) - Vinculación manual
- **IGNORADO**: Rojo claro (rose) - Ignorado

Reutiliza el componente `Badge` existente con variantes específicas.

#### [NEW] [components/atoms/ScoreIndicator.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/atoms/ScoreIndicator.tsx)

Indicador visual del score de similitud:
- Barra de progreso circular o lineal
- Colores según el score: 
  - 0.95-1.00: Verde (excelente)
  - 0.70-0.94: Amarillo (bueno)
  - 0.00-0.69: Gris (bajo)
- Muestra el porcentaje del score

---

### 4. Componentes Moleculares (Molecules)

#### [NEW] [components/molecules/MovimientoExtractoCard.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/molecules/MovimientoExtractoCard.tsx)

Tarjeta para mostrar un movimiento del extracto:
- Fecha del movimiento
- Descripción completa
- Referencia (si existe)
- Valor en COP (con `CurrencyDisplay`)
- USD y TRM (si aplica)
- Indicador visual de tipo (entrada/salida)

#### [NEW] [components/molecules/MovimientoSistemaCard.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/molecules/MovimientoSistemaCard.tsx)

Tarjeta para mostrar un movimiento del sistema:
- Fecha del movimiento
- Descripción completa
- Referencia (si existe)
- Valor en COP (con `CurrencyDisplay`)
- USD y TRM (si aplica)
- Tercero asociado
- Centro de costo
- Concepto
- Indicador visual de tipo (entrada/salida)

#### [NEW] [components/molecules/MatchScoreBreakdown.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/molecules/MatchScoreBreakdown.tsx)

Desglose visual de los scores de similitud:
- Score de fecha (con `ScoreIndicator`)
- Score de valor (con `ScoreIndicator`)
- Score de descripción (con `ScoreIndicator`)
- Score total ponderado (destacado)
- Tooltip explicativo de cada score

---

### 5. Componentes Organismo (Organisms)

#### [NEW] [components/organisms/DualPanelComparison.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/organisms/DualPanelComparison.tsx)

Panel dual para comparar movimientos lado a lado:
- **Panel izquierdo**: Movimiento del extracto (`MovimientoExtractoCard`)
- **Panel central**: 
  - `MatchStatusBadge` con el estado
  - `MatchScoreBreakdown` con los scores
  - Botones de acción (vincular, desvincular, ignorar)
- **Panel derecho**: Movimiento del sistema (`MovimientoSistemaCard`)
- Resalta diferencias visuales entre ambos movimientos
- Maneja estados de carga y errores

#### [NEW] [components/organisms/MatchingStatsCard.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/organisms/MatchingStatsCard.tsx)

Tarjeta con estadísticas del matching:
- Total de movimientos del extracto
- Total de movimientos del sistema
- Matches exactos (con porcentaje)
- Matches probables (con porcentaje)
- Sin match (con porcentaje)
- Traslados detectados
- Movimientos ignorados
- Gráfico de barras o dona para visualización
- Usa el componente `Card` existente

#### [NEW] [components/organisms/MatchingFilters.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/organisms/MatchingFilters.tsx)

Filtros para la vista de matching:
- Filtro por estado (EXACTO, PROBABLE, SIN_MATCH, MANUAL, IGNORADO)
- Filtro por rango de score
- Filtro por traslados
- Filtro por confirmación de usuario
- Botón de limpiar filtros
- Reutiliza estilos de `FiltrosReporte`

#### [NEW] [components/organisms/ConfiguracionMatchingForm.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/organisms/ConfiguracionMatchingForm.tsx)

Formulario para configurar el algoritmo de matching:
- **Tolerancias**:
  - Tolerancia de valor (COP)
  - Similitud mínima de descripción
- **Pesos** (deben sumar 1.00):
  - Peso de fecha
  - Peso de valor
  - Peso de descripción
- **Scores mínimos**:
  - Score mínimo para EXACTO
  - Score mínimo para PROBABLE
- **Palabras clave para traslados** (lista editable)
- Validaciones en tiempo real
- Botón de guardar y cancelar

---

### 6. Página Principal

#### [NEW] [pages/ConciliacionMatchingPage.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/pages/ConciliacionMatchingPage.tsx)

Página principal de matching inteligente:

**Estructura:**
1. **Header**:
   - Título: "Matching Inteligente"
   - Selector de cuenta (solo cuentas con `permite_conciliar`)
   - Selector de periodo (año/mes)
   - Botón "Ejecutar Matching"
   - Botón "Configuración" (abre modal)

2. **Estadísticas** (`MatchingStatsCard`):
   - Muestra resumen del matching actual

3. **Filtros** (`MatchingFilters`):
   - Permite filtrar los resultados

4. **Lista de Matches**:
   - Muestra cada match con `DualPanelComparison`
   - Paginación o scroll infinito
   - Ordenamiento por score (descendente)

5. **Modal de Configuración**:
   - Contiene `ConfiguracionMatchingForm`
   - Solo visible para administradores

**Funcionalidades:**
- Ejecutar matching automático
- Vincular manualmente (drag & drop o modal de selección)
- Desvincular matches existentes
- Ignorar movimientos del extracto
- Actualizar configuración del algoritmo
- Exportar resultados (opcional)

---

### 7. Integración con Routing

#### [MODIFY] [App.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/App.tsx)

Agregar ruta para la nueva página:
```tsx
<Route path="/conciliacion/matching" element={<ConciliacionMatchingPage />} />
```

#### [MODIFY] [components/organisms/Sidebar.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/components/organisms/Sidebar.tsx) (si existe)

Agregar enlace en el menú de navegación:
- Sección: "Conciliación"
- Nombre: "Matching Inteligente"
- Icono: `GitCompare` o `Link2` de lucide-react
- Ruta: `/conciliacion/matching`

---

## Plan de Verificación

### 1. Verificación de Compilación

```bash
cd Frontend
npm run build
```

**Criterio de éxito**: El proyecto compila sin errores TypeScript.

### 2. Verificación Visual en Desarrollo

```bash
cd Frontend
npm run dev
```

**Pasos manuales:**
1. Navegar a `http://localhost:5173/conciliacion/matching`
2. Verificar que la página carga correctamente
3. Seleccionar una cuenta con movimientos
4. Seleccionar un periodo (ej: Enero 2026)
5. Hacer clic en "Ejecutar Matching"
6. Verificar que se muestran:
   - Estadísticas del matching
   - Lista de matches con comparación lado a lado
   - Badges de estado con colores correctos
   - Scores de similitud visualizados

### 3. Verificación de Funcionalidades

**Test 1: Vincular manualmente**
1. Buscar un movimiento con estado "SIN_MATCH"
2. Hacer clic en "Vincular manualmente"
3. Seleccionar un movimiento del sistema
4. Confirmar vinculación
5. Verificar que el estado cambia a "MANUAL"

**Test 2: Desvincular**
1. Buscar un movimiento vinculado
2. Hacer clic en "Desvincular"
3. Confirmar acción
4. Verificar que la vinculación se elimina

**Test 3: Ignorar movimiento**
1. Buscar un movimiento del extracto
2. Hacer clic en "Ignorar"
3. Ingresar razón
4. Confirmar
5. Verificar que el estado cambia a "IGNORADO"

**Test 4: Filtros**
1. Aplicar filtro por estado "EXACTO"
2. Verificar que solo se muestran matches exactos
3. Aplicar filtro por score > 0.90
4. Verificar que solo se muestran matches con score alto
5. Limpiar filtros y verificar que se muestran todos

**Test 5: Configuración**
1. Abrir modal de configuración
2. Modificar "Tolerancia de valor" a 200
3. Modificar "Score mínimo exacto" a 0.98
4. Guardar cambios
5. Verificar que se actualiza correctamente
6. Ejecutar matching nuevamente
7. Verificar que los resultados reflejan la nueva configuración

### 4. Verificación de Responsividad

**Pasos manuales:**
1. Abrir DevTools (F12)
2. Activar modo responsive
3. Probar en resoluciones:
   - Desktop: 1920x1080
   - Tablet: 768x1024
   - Mobile: 375x667
4. Verificar que:
   - Los paneles duales se apilan en mobile
   - Los filtros son accesibles
   - Las tarjetas se adaptan correctamente

### 5. Verificación de Integración con Backend

**Prerequisito**: Backend debe estar corriendo en `http://localhost:8000`

**Pasos:**
1. Abrir Network tab en DevTools
2. Ejecutar matching
3. Verificar llamadas HTTP:
   - `GET /api/matching/{cuenta_id}/{year}/{month}` - Status 200
   - Response contiene `matches` y `estadisticas`
4. Vincular manualmente
5. Verificar:
   - `POST /api/matching/vincular` - Status 200
   - Response contiene el match creado
6. Verificar que no hay errores de CORS

---

## Notas de Implementación

### Reutilización de Componentes Existentes

- `Badge` → Base para `MatchStatusBadge`
- `Card` → Base para tarjetas de movimientos
- `CurrencyDisplay` → Para mostrar valores monetarios
- `DataTable` → Opcional para vista de tabla (alternativa a cards)
- `FiltrosReporte` → Inspiración para `MatchingFilters`

### Estilos y Diseño

- Mantener consistencia con el diseño existente de `ConciliacionPage`
- Usar paleta de colores del proyecto:
  - Emerald: Extracto / Éxito
  - Blue: Sistema / Info
  - Amber: Advertencia / Probable
  - Rose: Error / Ignorado
  - Gray: Neutral / Sin match

### Manejo de Estados

- Usar React Query para:
  - Cache de resultados de matching
  - Invalidación automática después de acciones
  - Loading y error states
- Usar `useState` para:
  - Filtros locales
  - Modal de configuración
  - Selección de movimientos

### Accesibilidad

- Todos los botones deben tener `aria-label`
- Los badges deben tener `role="status"`
- Los scores deben tener tooltips explicativos
- Navegación por teclado funcional

---

## Dependencias

No se requieren nuevas dependencias npm. Todas las librerías necesarias ya están instaladas:
- React
- React Query
- TypeScript
- TailwindCSS
- Lucide React

---

## Estimación de Complejidad

- **Tipos TypeScript**: 1 archivo, ~100 líneas
- **Servicio API**: 1 archivo, ~150 líneas
- **Átomos**: 2 componentes, ~100 líneas c/u
- **Moléculas**: 3 componentes, ~150 líneas c/u
- **Organismos**: 4 componentes, ~250 líneas c/u
- **Página**: 1 archivo, ~500 líneas
- **Integración**: 2 modificaciones menores

**Total estimado**: ~2,500 líneas de código TypeScript/TSX

**Tiempo estimado**: 1-2 sesiones de desarrollo
