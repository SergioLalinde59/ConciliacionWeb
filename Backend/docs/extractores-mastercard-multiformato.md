# Soporte Multi-Formato para Extractos MasterCard

## Contexto

A partir de **septiembre 2025**, Bancolombia cambió el formato de los extractos PDF de las tarjetas MasterCard. Este cambio afectó tanto a MasterCardPesos como MasterCardUSD.

## Problema

Teníamos extractores que funcionaban correctamente con el formato nuevo (sept 2025+), pero necesitábamos mantener compatibilidad con extractos antiguos (pre-sept 2025) para:
- Procesamiento histórico de datos
- Actualización de conciliaciones pasadas
- Migración gradual de datos

## Solución Implementada

### 1. Nuevos Extractores para Formato Antiguo

Se crearon extractores específicos para el formato anterior:

- `mastercard_pesos_extracto_anterior.py`
- `mastercard_usd_extracto_anterior.py`

**Ubicación:** `backend/src/infrastructure/extractors/bancolombia/`

### 2. Diferencias entre Formatos

| Aspecto | Formato NUEVO (Sept 2025+) | Formato ANTIGUO (Pre-Sept 2025) |
|---------|---------------------------|--------------------------------|
| **Periodo** | "Periodo facturado desde: DD/MM/AAAA hasta: DD/MM/AAAA" | "Desde: DD/MM/AAAA Hasta: DD/MM/AAAA" |
| **Estructura Resumen** | Campos sin prefijos explícitos | Campos con "+" y "-" explícitos |
| **Saldo Final** | Calculado automáticamente | Campo explícito "Saldo a pagar" |
| **Formato Texto** | Normal | Puede tener caracteres "triplicados" |

### 3. Detección Automática de Formato

El sistema detecta automáticamente qué formato usar mediante **fallback inteligente**:

```python
# En procesador_archivos_service.py
try:
    # Primero intenta con formato NUEVO
    datos = bancolombia.extraer_resumen_mastercard_pesos(file_obj)
except Exception as e_nuevo:
    # Si falla, intenta con formato ANTIGUO
    file_obj.seek(0)  # Reinicia puntero del archivo
    datos = bancolombia.extraer_resumen_mastercard_pesos_anterior(file_obj)
```

**Ventajas:**
- ✅ Sin intervención manual del usuario
- ✅ Transparente para el frontend
- ✅ Mantiene código limpio y separado
- ✅ Fácil de mantener

### 4. Estructura de Archivos

```
bancolombia/
├── __init__.py                              # Exports de todos los extractores
├── mastercard_movimientos.py                # Movimientos (unificado)
├── mastercard_pesos_extracto.py             # Resumen formato NUEVO (Pesos)
├── mastercard_pesos_extracto_anterior.py    # Resumen formato ANTIGUO (Pesos)
├── mastercard_usd_extracto.py               # Resumen formato NUEVO (USD)
├── mastercard_usd_extracto_anterior.py      # Resumen formato ANTIGUO (USD)
├── ahorros_movimientos.py
├── ahorros_extracto.py
├── fondorenta_movimientos.py
└── fondorenta_extracto.py
```

## Patrones de Extracción

### Formato ANTIGUO - Pesos

**Indicadores de Moneda:**
- "Estado de cuenta en: PESOS"
- Presencia de "Cupo total"

**Patrones Regex Clave:**
```python
# Periodo
r'Desde:\s*(\d{1,2})/(\d{1,2})/(\d{4})\s+Hasta:\s*(\d{1,2})/(\d{1,2})/(\d{4})'

# Saldo anterior
r'Saldo anterior\s*\+?\s*(?:Compras del mes)?\s*\$?\s*([0-9,.]+)'

# Pagos/abonos
r'\+\s*Pagos\s*/\s*abonos\s*\$?\s*([0-9,.]+)'

# Saldo a pagar (saldo final)
r'Saldo a pagar\s*\$?\s*([0-9,.]+)'
```

**Cálculo de Salidas:**
```python
salidas = compras + int_corrientes + avances
```

### Formato ANTIGUO - USD

Misma estructura que Pesos, pero:
- Indicador: "Estado de cuenta en: DOLARES"
- Parsing de valores con detección automática de formato (colombiano vs USA)

**Parser Inteligente:**
```python
def _parsear_valor_usd(valor_str: str) -> Decimal:
    """
    Detecta automáticamente si usa formato colombiano (1.234,56)
    o formato USA (1,234.56) basándose en la posición de coma/punto.
    """
    # Si tiene ambos, el último es el decimal
    # Si solo tiene coma, asume formato colombiano
```

## Testing Manual

Para verificar que funciona:

1. **Subir extracto antiguo (pre-sept 2025)**
   - El sistema debería detectar formato antiguo automáticamente
   - Logs mostrarán: "Intentando FORMATO NUEVO" → "Formato NUEVO falló" → "Intentando FORMATO ANTIGUO" → "✓ Extracción exitosa"

2. **Subir extracto nuevo (sept 2025+)**
   - El sistema usará formato nuevo directamente
   - Logs mostrarán: "Intentando FORMATO NUEVO" → "✓ Extracción exitosa"

## Logs de Debug

Los extractores generan archivos de debug:
- `debug_mastercard_pesos_anterior_text.txt`
- `debug_mastercard_usd_anterior_text.txt`

Estos archivos contienen el texto extraído del PDF para inspección manual.

## Mantenimiento Futuro

### Deprecación del Formato Antiguo

Una vez que todos los extractos históricos hayan sido procesados (estimado: 6-12 meses), se puede:

1. Analizar logs para confirmar que formato antiguo ya no se usa
2. Marcar extractores antiguos como deprecated
3. Eventualmente eliminar archivos:
   - `mastercard_pesos_extracto_anterior.py`
   - `mastercard_usd_extracto_anterior.py`
4. Simplificar lógica en `procesador_archivos_service.py`

### Añadir Nuevos Formatos

Si Bancolombia cambia el formato nuevamente:

1. Crear nuevo extractor: `mastercard_pesos_extracto_v3.py`
2. Actualizar lógica de fallback en `procesador_archivos_service.py`
3. Documentar cambios en este archivo

## Convención de Nombres

**Regla:** `[producto]_[tipo]_[variante].py`

Ejemplos:
- `mastercard_pesos_extracto.py` → Versión actual/estándar
- `mastercard_pesos_extracto_anterior.py` → Versión anterior
- `mastercard_pesos_extracto_v3.py` → Futura versión 3 (si se necesita)
- `mastercard_pesos_movimientos.py` → Sin variante (unificado)

## Beneficios de esta Arquitectura

1. **Separación de responsabilidades**: Cada extractor maneja un formato específico
2. **Código limpio**: No hay lógica condicional compleja dentro de los extractores
3. **Fácil debugging**: Logs claros indican qué formato se detectó
4. **Mantenible**: Agregar/eliminar formatos no afecta código existente
5. **Testeable**: Cada extractor se puede probar independientemente
6. **Claridad**: El nombre del archivo indica claramente qué maneja

## Referencias

- **Imágenes de referencia**: Ver inicio de conversación para ejemplos de PDFs antiguos
- **Commit**: Implementación de extractores multi-formato MasterCard
- **Fecha**: 2026-01-16
