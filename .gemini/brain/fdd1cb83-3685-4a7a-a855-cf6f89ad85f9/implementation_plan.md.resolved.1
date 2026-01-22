# Mejorar Lógica de Sugerencias de Clasificación

Corregir el comportamiento cuando un movimiento no tiene referencia para que no muestre historial de movimientos con referencia de otros terceros.

## User Review Required

> [!WARNING]
> **Cambio significativo en lógica de sugerencias**
> 
> Se modificará sustancialmente cómo se buscan movimientos relacionados cuando NO hay referencia. Específicamente:
> 
> - No se sugerirá tercero basándose solo en descripción cuando el movimiento no tiene referencia
> - Para movimientos SIN referencia, el historial mostrará solo movimientos SIN referencia de la misma cuenta
> - Se agregará columna "Cuenta" en el historial
> 
> ¿Te parece correcto este enfoque?

## Proposed Changes

### Backend - Lógica de Sugerencias

#### [MODIFY] [clasificacion_service.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/application/services/clasificacion_service.py)

**Problema actual (líneas 188-224):**
- Busca tercero por descripción incluso cuando el movimiento no tiene referencia
- Esto causa que movimientos de "Fondo Renta" sin referencia sugieran "Protección" solo porque la descripción coincide

**Solución propuesta:**

1. **NO sugerir tercero por descripción si el movimiento NO tiene referencia** (eliminar o condicionar líneas 188-224)

2. **Modificar lógica de "Contexto Histórico" para movimientos SIN referencia** (líneas 226-244):

```python
# 3. CONTEXTO HISTÓRICO
# ============================================
es_fondo_renta = movimiento.cuenta_id == 3
tiene_referencia = bool(movimiento.referencia and len(movimiento.referencia.strip()) > 0)

if es_fondo_renta:
    # Para Fondo Renta: obtener últimos movimientos de esta cuenta
    # IMPORTANTE: Si el movimiento actual NO tiene referencia, solo mostrar historial SIN referencia
    movs_cuenta, _ = self.movimiento_repo.buscar_avanzado(
        cuenta_id=3,
        limit=50
    )
    
    # Filtrar por referencia: si mov actual no tiene, no mostrar los que sí tienen
    if not tiene_referencia:
        contexto_movimientos = [
            m for m in movs_cuenta 
            if m.id != movimiento.id 
            and m.tercero_id is not None
            and m.centro_costo_id is not None
            and m.concepto_id is not None
            and not m.referencia  # Solo sin referencia
        ]
    else:
        contexto_movimientos = [
            m for m in movs_cuenta 
            if m.id != movimiento.id 
            and m.tercero_id is not None
            and m.centro_costo_id is not None
            and m.concepto_id is not None
        ]
        
    # Adicionalmente filtrar por descripción similar si no tiene referencia
    if not tiene_referencia and contexto_movimientos:
        # Buscar por primeras palabras de la descripción
        desc_actual = movimiento.descripcion or ""
        palabras_ignorar = {'y', 'de', 'la', 'el', 'en', 'a', 'por', 'para', 'con', 'cop', 'usd', 'traslado', 'fondo'}
        palabras = desc_actual.split()
        palabras_significativas = [p for p in palabras if p.lower() not in palabras_ignorar and len(p) > 2]
        
        # Si hay palabras significativas, filtrar por similitud
        if palabras_significativas and len(palabras_significativas) >= 2:
            patron_busqueda = " ".join(palabras_significativas[:3]).lower()
            contexto_filtrado = [
                m for m in contexto_movimientos
                if patron_busqueda in (m.descripcion or "").lower()
            ]
            if contexto_filtrado:
                contexto_movimientos = contexto_filtrado

elif sugerencia['tercero_id'] and not referencia_no_existe:
    # Caso normal: mostrar historial del tercero sugerido
    # ... resto del código existente
```

---

### Frontend - Historial Relacionado

#### [MODIFY] [ClasificarMovimientosPage.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/pages/ClasificarMovimientosPage.tsx)

**Agregar columna "Cuenta" entre Fecha y Referencia (líneas 405-415):**

```tsx
<thead>
    <tr className="bg-gray-50 text-left text-gray-500">
        <th className="px-4 py-2">Fecha</th>
        <th className="px-4 py-2">Cuenta</th>  {/* NUEVA COLUMNA */}
        <th className="px-4 py-2">Referencia</th>
        <th className="px-4 py-2">Descripción</th>
        <th className="px-4 py-2">Valor</th>
        <th className="px-4 py-2">Tercero</th>
        <th className="px-4 py-2">Clasificación Asignada</th>
        <th className="px-4 py-2">Acción</th>
    </tr>
</thead>
```

**Agregar celda de cuenta en el tbody (líneas 418-444):**

```tsx
{sugerenciaData.contexto.map((ctx) => (
    <tr key={ctx.id} className="border-b hover:bg-gray-50">
        <td className="px-4 py-2 whitespace-nowrap">{ctx.fecha}</td>
        
        {/* NUEVA CELDA: Cuenta */}
        <td className="px-4 py-2 text-sm text-blue-600 font-medium whitespace-nowrap">
            {ctx.cuenta_display || '-'}
        </td>
        
        <td className="px-4 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
            {ctx.referencia || '-'}
        </td>
        {/* ... resto de las celdas */}
    </tr>
))}
```

---

### Backend - API Response (verificar)

#### [MODIFY] [movimientos.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/infrastructure/api/routers/movimientos.py)

Verificar que `MovimientoResponse` incluya `cuenta_display`:

```python
class MovimientoResponse(BaseModel):
    id: int
    fecha: str
    valor: float
    descripcion: str
    referencia: Optional[str]
    cuenta_id: Optional[int]
    cuenta_display: Optional[str]  # DEBE EXISTIR
    # ... otros campos
```

## Verification Plan

### Manual Verification

**Caso de Prueba 1: Movimiento Fondo Renta sin referencia**

1. Ir a página "Pendientes" de clasificación
2. Seleccionar movimiento "Traslado De Fondo De 70549325Renta Fija" (sin referencia)
3. **Verificar que:**
   - ✅ Sugerencia de tercero es "Fondo Renta" (por cuenta_id=3)
   - ✅ Historial muestra SOLO movimientos de cuenta "1 - Ahorros" (Fondo Renta)
   - ✅ Historial NO muestra movimientos con referencia
   - ✅ Historial muestra movimientos con descripción similar ("Traslado")
   - ✅ Columna "Cuenta" aparece en la tabla entre Fecha y Referencia
   - ✅ NO sugiere "Protección"

**Caso de Prueba 2: Movimiento con referencia**

1. Seleccionar movimiento con referencia (ej: "Transferencia Cta Suc")
2. **Verificar que:**
   - ✅ Sugerencia usa la referencia para buscar en aliases
   - ✅ Historial muestra movimientos del tercero sugerido
   - ✅ Puede incluir movimientos con o sin similar referencia
   - ✅ Columna "Cuenta" aparece correctamente
