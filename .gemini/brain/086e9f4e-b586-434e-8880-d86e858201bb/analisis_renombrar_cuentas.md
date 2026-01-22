# Análisis: Propuesta de Renombrar Cuentas y Eliminar `tipo_cuenta`

## 📋 Propuesta del Usuario

**Renombrar cuentas en la BD**:
- `"Ahorros"` → Tipo de cuenta actual: `bancolombia_ahorro` → Cambiar a usar nombre directamente
- `"FondoRenta"` → Ya usa `FondoRenta` (sin cambios)
- `"Mc Pesos"` → Renombrar a `"MasterCardPesos"`
- `"Mc Dolars"` → Renombrar a `"MasterCardUSD"`

**Objetivo**: Usar el `nombre_cuenta` directamente para determinar qué extractor PDF usar, eliminando la necesidad del campo `tipo_cuenta`.

---

## ✅ VALIDEZ DE LA PROPUESTA

**Esta propuesta es VÁLIDA y RECOMENDADA** por las siguientes razones:

1. **Simplifica la arquitectura**: Un solo campo (`nombre_cuenta`) determina el extractor
2. **Reduce redundancia**: Elimina la necesidad de mantener dos campos sincronizados
3. **Más intuitivo**: El nombre de la cuenta describe directamente su naturaleza
4. **Facilita escalabilidad**: Agregar nuevos bancos solo requiere crear cuenta con nombre correcto

---

## 🔍 ANÁLISIS DEL CÓDIGO ACTUAL

### Backend

#### 1. **Router de Archivos** (`archivos.py`)
```python
# Línea 24, 53: tipo_cuenta recibido como parámetro Form
tipo_cuenta: str = Form(...)
```
**Impacto**: El frontend envía `tipo_cuenta` → Backend lo usa para determinar extractor

#### 2. **Service** (`procesador_archivos_service.py`)

**Movimientos** (líneas 64-71):
```python
def _extraer_movimientos(self, file_obj, tipo_cuenta):
    if tipo_cuenta == 'bancolombia_ahorro':  # ← Debe cambiar a 'Ahorros'
        raw_movs = bancolombia.extraer_movimientos_ahorros(file_obj)
    elif tipo_cuenta == 'credit_card':        # ← Debe cambiar a 'MasterCardPesos' o 'MasterCardUSD'
        raw_movs = bancolombia.extraer_movimientos_mastercard(file_obj)
    elif tipo_cuenta == 'fondo_renta':        # ← Debe cambiar a 'FondoRenta'
        raw_movs = bancolombia.extraer_movimientos_fondorenta(file_obj)
```

**Extractos** (líneas 281-299):
```python
def analizar_extracto(self, file_obj, filename, tipo_cuenta):
    if tipo_cuenta == 'bancolombia_ahorro':     # ← Cambiar a 'Ahorros'
        datos = bancolombia.extraer_resumen_ahorros(file_obj)
    elif tipo_cuenta == 'FondoRenta':           # ✅ Ya correcto
        datos = bancolombia.extraer_resumen_fondorenta(file_obj)
    elif tipo_cuenta == 'MasterCardPesos':      # ✅ Ya correcto
        datos = bancolombia.extraer_resumen_mastercard_pesos(file_obj)
    elif tipo_cuenta == 'MasterCardUSD':        # ✅ Ya correcto
        datos = bancolombia.extraer_resumen_mastercard_usd(file_obj)
```

**Lógica especial TC** (líneas 123, 231):
```python
if not es_duplicado and tipo_cuenta == 'credit_card':  # ← Debe actualizar
```

### Frontend

#### 1. **UploadExtractoPage.tsx** (líneas 136-144)

```typescript
const cuenta = cuentas.find(c => c.id === id)
if (cuenta) {
    const nombreLower = cuenta.nombre.toLowerCase()
    if (nombreLower.includes('ahorro') || nombreLower.includes('bancolombia')) {
        setTipoCuenta('bancolombia_ahorro')  // ← Cambiará a cuenta.nombre directamente
    } else if (nombreLower.includes('renta') || nombreLower.includes('fondo')) {
        setTipoCuenta('FondoRenta')
    }
}
```

**Impacto**: Esta lógica inferencial se simplificará a `setTipoCuenta(cuenta.nombre)`

---

## ⚠️ RIESGOS IDENTIFICADOS

### Riesgo 1: **Movimientos de Tarjeta de Crédito** 🔴 ALTO

**Problema**: 
- Actualmente `credit_card` cubre AMBAS cuentas: Mc Pesos Y Mc Dolars
- El mismo extractor (`extraer_movimientos_mastercard`) maneja ambas monedas
- Al renombrar, tendremos DOS nombres distintos pero UN SOLO extractor

**Solución requerida**:
```python
# En _extraer_movimientos
if tipo_cuenta in ['MasterCardPesos', 'MasterCardUSD']:
    raw_movs = bancolombia.extraer_movimientos_mastercard(file_obj)
```

### Riesgo 2: **Datos Históricos** 🟡 MEDIO

**Problema**:
- Si hay datos históricos que referencian nombres antiguos en logs, reportes o datos JSON

**Mitigación**:
- Actualización es solo en tabla `cuentas` (campo `cuenta`)
- Los movimientos solo referencian `cuenta_id`, no el nombre
- ✅ Bajo riesgo real

### Riesgo 3: **Frontend Hardcoded** 🟡 MEDIO

**Problema**:
- Código hardcoded en frontend (línea 21 de UploadExtractoPage.tsx):
```typescript
const [tipoCuenta, setTipoCuenta] = useState('bancolombia_ahorro')
```

**Solución**: Cambiar valor por defecto a `'Ahorros'` o `''`

### Riesgo 4: **Case Sensitivity** 🟢 BAJO

**Problema**: 
- Nombres de cuenta son case-sensitive en SQL
- Si el frontend envía "masterCardPesos" pero la BD tiene "MasterCardPesos"

**Mitigación**: 
- Usar normalización en backend (`.strip()`, comparación insensible)
- O mantener nombres exactos

---

## 📝 CAMBIOS REQUERIDOS

### Base de Datos

```sql
-- Renombrar cuentas
UPDATE cuentas SET cuenta = 'Ahorros' WHERE cuenta = 'Ahorros' AND cuentaid = 1;
UPDATE cuentas SET cuenta = 'MasterCardPesos' WHERE cuenta = 'Mc Pesos' AND cuentaid = 6;
UPDATE cuentas SET cuenta = 'MasterCardUSD' WHERE cuenta = 'Mc Dolars' AND cuentaid = 7;
-- FondoRenta ya está correcto
```

### Backend

#### `procesador_archivos_service.py`

**Cambio 1: `_extraer_movimientos`** (líneas 64-71)
```python
def _extraer_movimientos(self, file_obj: Any, tipo_cuenta: str) -> List[Dict[str, Any]]:
    raw_movs = []
    if tipo_cuenta == 'Ahorros':
        raw_movs = bancolombia.extraer_movimientos_ahorros(file_obj)
    elif tipo_cuenta in ['MasterCardPesos', 'MasterCardUSD']:
        raw_movs = bancolombia.extraer_movimientos_mastercard(file_obj)
    elif tipo_cuenta == 'FondoRenta':
        raw_movs = bancolombia.extraer_movimientos_fondorenta(file_obj)
    else:
        raise ValueError(f"Tipo de cuenta no soportado: {tipo_cuenta}")
```

**Cambio 2: `analizar_extracto`** (líneas 281-299)
```python
def analizar_extracto(self, file_obj: Any, filename: str, tipo_cuenta: str) -> Dict[str, Any]:
    datos = {}
    if tipo_cuenta == 'Ahorros':
        datos = bancolombia.extraer_resumen_ahorros(file_obj)
    elif tipo_cuenta == 'FondoRenta':
        datos = bancolombia.extraer_resumen_fondorenta(file_obj)
    elif tipo_cuenta == 'MasterCardPesos':
        datos = bancolombia.extraer_resumen_mastercard_pesos(file_obj)
    elif tipo_cuenta == 'MasterCardUSD':
        datos = bancolombia.extraer_resumen_mastercard_usd(file_obj)
    else:
        raise ValueError(f"Extracción de resumen no soportada para: {tipo_cuenta}")
```

**Cambio 3: Lógica especial TC** (líneas 123, 231)
```python
if not es_duplicado and tipo_cuenta in ['MasterCardPesos', 'MasterCardUSD']:
```

### Frontend

#### `UploadExtractoPage.tsx`

**Cambio 1: Estado inicial** (línea 21)
```typescript
const [tipoCuenta, setTipoCuenta] = useState('')
```

**Cambio 2: Inferencia automática** (líneas 136-144)
```typescript
const cuenta = cuentas.find(c => c.id === id)
if (cuenta) {
    setTipoCuenta(cuenta.nombre)  // Usar nombre directamente
}
```

#### **Archivos similares**
- `UploadMovimientosPage.tsx` (si existe código similar)
- Cualquier otro componente que infiera `tipo_cuenta`

---

## ✅ RECOMENDACIÓN FINAL

### **PROCEDER CON LA PROPUESTA** con las siguientes precauciones:

1. **Aplicar cambios en orden**:
   - ✅ Primero: Actualizar backend para aceptar AMBOS formatos (viejo y nuevo)
   - ✅ Segundo: Renombrar cuentas en BD
   - ✅ Tercero: Actualizar frontend
   - ✅ Cuarto: Eliminar soporte para formato viejo del backend

2. **Manejo de MasterCard**:
   - Usar `in ['MasterCardPesos', 'MasterCardUSD']` para movimientos (mismo extractor)
   - Usar comparaciones individuales para extractos (diferentes extractores)

3. **Testing**:
   - Probar carga de movimientos para cada cuenta
   - Probar carga de extractos para cada cuenta
   - Verificar que duplicados se detecten correctamente

---

## 📊 Resumen de Impacto

| Componente | Archivos Afectados | Riesgo | Esfuerzo |
|------------|-------------------|--------|----------|
| Base de Datos | `UPDATE` a 2 cuentas | Bajo | Bajo |
| Backend Service | `procesador_archivos_service.py` | Medio | Bajo |
| Backend Routers | Sin cambios (recibe parámetro) | Bajo | Ninguno |
| Frontend Pages | `UploadExtractoPage.tsx`, `UploadMovimientosPage.tsx` | Bajo | Bajo |
| Frontend Services | Sin cambios lógicos | Bajo | Ninguno |

**Tiempo estimado**: 30-45 minutos de implementación + testing
