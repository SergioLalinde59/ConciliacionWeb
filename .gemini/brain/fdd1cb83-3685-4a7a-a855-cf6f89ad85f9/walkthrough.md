# Mejoras en Lógica de Sugerencias de Clasificación

## Resumen

Se implementaron mejoras significativas en la lógica de sugerencias de clasificación para movimientos bancarios, específicamente corrigiendo el comportamiento cuando un movimiento **no tiene referencia**.

## Problema Original

**Situación:**
- Movimiento de cuenta "Fondo Renta" (Ahorros) sin referencia
- Descripción: "Traslado De Fondo De 70549325Renta Fija"
- **Comportamiento incorrecto:** Mostraba historial de movimientos de "Protección" con referencia

**Causas identificadas:**
1. Sistema sugería tercero basándose solo en descripción, incluso sin referencia
2. Mezclaba movimientos con y sin referencia en el historial
3. No filtraba por descripción similar en la misma cuenta

## Cambios Implementados

### Backend

#### [clasificacion_service.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/application/services/clasificacion_service.py)

**1. Búsqueda por descripción condicionada a existencia de referencia**

```python
# Definir si tiene referencia
tiene_referencia = bool(movimiento.referencia and len(movimiento.referencia.strip()) > 0)

# Solo buscar tercero por descripción SI tiene referencia
if not sugerencia['tercero_id'] and tiene_referencia and self.tercero_descripcion_repo:
    # ... búsqueda por descripción en tercero_descripciones
```

**Razón:** Evita sugerir terceros irrelevantes basándose solo en coincidencias de descripción cuando el movimiento no tiene referencia.

---

**2. Filtrado de contexto histórico mejorado**

Para movimientos de Fondo Renta sin referencia:

```python
if not tiene_referencia:
    # Filtrar: solo movimientos SIN referencia
    contexto_movimientos = [
        m for m in movs_cuenta 
        if m.id != movimiento.id 
        and m.tercero_id is not None
        and m.centro_costo_id is not None
        and m.concepto_id is not None
        and not m.referencia  # ← Clave: solo sin referencia
    ]
    
    # Adicionalmente filtrar por descripción similar
    if contexto_movimientos:
        desc_actual = movimiento.descripcion or ""
        palabras_ignorar = {'y', 'de', 'la', 'el', 'en', 'a', 'por', 'para', 'con', 'cop', 'usd', 'traslado', 'fondo', 'renta'}
        palabras = desc_actual.split()
        palabras_significativas = [p for p in palabras if p.lower() not in palabras_ignorar and len(p) > 2]
        
        if palabras_significativas and len(palabras_significativas) >= 2:
            patron_busqueda = " ".join(palabras_significativas[:3]).lower()
            contexto_filtrado = [
                m for m in contexto_movimientos
                if patron_busqueda in (m.descripcion or "").lower()
            ]
            if contexto_filtrado:
                contexto_movimientos = contexto_filtrado
```

**Beneficios:**
- ✅ No mezcla movimientos con/sin referencia
- ✅ Filtra por descripción similar (ej: "Traslado")
- ✅ Muestra solo movimientos relevantes de la misma cuenta

---

### Frontend

#### [ClasificarMovimientosPage.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/pages/ClasificarMovimientosPage.tsx)

**Columna "Cuenta" agregada en Historial Relacionado**

```tsx
<thead>
    <tr className="bg-gray-50 text-left text-gray-500">
        <th className="px-4 py-2">Fecha</th>
        <th className="px-4 py-2">Cuenta</th>  {/* ← NUEVA */}
        <th className="px-4 py-2">Referencia</th>
        <th className="px-4 py-2">Descripción</th>
        {/* ... */}
    </tr>
</thead>

<tbody>
    {sugerenciaData.contexto.map((ctx) => (
        <tr key={ctx.id}>
            <td>{ctx.fecha}</td>
            <td className="text-sm text-blue-600 font-medium">
                {ctx.cuenta_display || '-'}  {/* ← NUEVA */}
            </td>
            <td>{ctx.referencia || '-'}</td>
            {/* ... */}
        </tr>
    ))}
</tbody>
```

**Formato:** `"id - nombre_cuenta"` (ej: "1 - Ahorros")

---

## Resultado Esperado

**Para movimiento de Fondo Renta sin referencia:**

✅ **Antes:** 
- Sugerencia: "Protección" (incorrecto)
- Historial: Movimientos de "Protección" con referencia

✅ **Ahora:**
- Sugerencia: "Fondo Renta" (por cuenta_id=3)
- Historial: Solo movimientos de "Fondo Renta" sin referencia con descripción similar
- Columna "Cuenta" visible mostrando "1 - Ahorros"

---

## Verificación Manual Requerida

> [!IMPORTANT]
> **Pasos para verificar:**
> 
> 1. Ir a página "Pendientes" de clasificación
> 2. Seleccionar movimiento "Traslado De Fondo De 70549325Renta Fija"
> 3. Verificar en "Editor de Clasificación":
>    - ✅ Sugerencia es "Fondo Renta"
>    - ✅ Historial muestra solo movimientos de cuenta "1 - Ahorros"
>    - ✅ Historial NO muestra movimientos con referencia
>    - ✅ Columna "Cuenta" aparece entre Fecha y Referencia
>    - ✅ NO sugiere "Protección"

## Archivos Modificados

- [clasificacion_service.py](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Backend/src/application/services/clasificacion_service.py#L188-L385)
- [ClasificarMovimientosPage.tsx](file:///F:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/Frontend/src/pages/ClasificarMovimientosPage.tsx#L406-L422)

---

## Mejora Adicional: Sugerencia Automática por Tercero Común

### Funcionalidad

Si **todos** los movimientos en el historial relacionado tienen el **mismo tercero**, el sistema ahora lo sugiere automáticamente.

### Implementación

```python
# Después de filtrar y ordenar el contexto (límite 5 movimientos)
if not sugerencia['tercero_id'] and contexto_movimientos:
    terceros_unicos = set(m.tercero_id for m in contexto_movimientos if m.tercero_id)
    
    # Si hay exactamente un tercero único
    if len(terceros_unicos) == 1:
        tercero_comun_id = terceros_unicos.pop()
        tercero_comun = self.tercero_repo.obtener_por_id(tercero_comun_id)
        if tercero_comun:
            sugerencia['tercero_id'] = tercero_comun_id
            sugerencia['razon'] = f"Todos los movimientos históricos similares son de: {tercero_comun.tercero}"
            sugerencia['tipo_match'] = 'tercero_comun_historico'
```

### Ejemplo

**Escenario:**
- Movimiento: "Traslado De Fondo De 70549325Renta Fija" (sin referencia)
- Historial: 5 movimientos, todos con tercero = "Fondo Renta"

**Resultado:**
- ✅ Sugerencia automática: "198 - Fondo Renta"
- ✅ Razón: "Todos los movimientos históricos similares son de: Fondo Renta"
- ✅ Usuario solo necesita seleccionar Centro de Costo y Concepto

### Beneficios

- 🚀 **Clasificación más rápida**: Menos campos para completar manualmente
- 🎯 **Mayor precisión**: Basada en historial real del usuario
- ⚡ **Mejor UX**: Reduce el trabajo repetitivo

