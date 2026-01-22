# Análisis del PDF MasterCard

## Problema Identificado

El PDF **SÍ es de PESOS**, pero el texto está siendo extraído con **caracteres triplicados**, lo que hace que los patrones regex no coincidan.

## Evidencia

### Texto Esperado vs Texto Extraído

| Campo | Esperado | Extraído del PDF |
|-------|----------|------------------|
| Moneda | `Moneda: PESOS` | `MMMooonnneeedddaaa::: PPPEEESSSOOOSSS` |
| Saldo anterior | `+ Saldo anterior $ 17.103.116,49` | `+ Saldo anterior $ 17.103.116,49` ✓ |
| Compras del mes | `+ Compras del mes $ 17.945.937,00` | `+ Compras del mes $ 17.945.937,00` ✓ |
| Pagos/abonos | `(-) Pagos / abonos $ 17.103.117,00` | `(-) Pagos / abonos $ 17.103.117,00` ✓ |

## Observaciones

1. **La moneda se muestra triplicada**: `MMMooonnneeedddaaa::: PPPEEESSSOOOSSS`
   - Por eso la verificación falla
   
2. **Los montos en la sección de resumen están correctos**:
   - Saldo anterior: $17.103.116,49
   - Compras del mes: $17.945.937,00
   - Pagos/abonos: $17.103.117,00
   
3. **El formato del periodo facturado está correcto**: 
   - `30 nov - 30 dic. 2025`

## Página Correcta

El resumen está en la **página 3** del PDF (no en las primeras 2 páginas), pero está siendo procesada correctamente.

## Solución Requerida

Necesitamos hacer los regex más flexibles para aceptar:
1. Texto triplicado: `MMMooonnneeedddaaa` en lugar de `Moneda`
2. Múltiples espacios y caracteres especiales
3. Buscar en más páginas (ya estamos buscando en las primeras 3)

## Formato Detectado del PDF

```
+ Saldo anterior $ 17.103.116,49
+ Compras del mes $ 17.945.937,00
+ Avances $ 0,00
+ Otros cargos $ 0,00
(-) Pagos / abonos $ 17.103.117,00
```

El formato es **exactamente el que esperamos**, solo necesitamos ajustar la verificación de moneda.
