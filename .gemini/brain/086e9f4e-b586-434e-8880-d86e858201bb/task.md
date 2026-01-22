# Task: Implementar Carga de Extracto PDF para Mastercard

## Objetivo
Implementar extractores de resumen para PDFs de extractos mensuales de Mastercard, soportando tanto pesos (COP) como dólares (USD).

## Checklist

### Análisis y Planificación
- [x] Analizar estructura del PDF de extracto de Mastercard
- [x] Definir campos a extraer: saldo anterior, compras/cargos, pagos/abonos, saldo final
- [x] Crear plan de implementación

### Implementación Backend
- [x] Implementar `mastercard_pesos_extracto.py` con función `extraer_resumen()`
- [x] Implementar `mastercard_usd_extracto.py` con función `extraer_resumen()`
- [x] Actualizar exports en `bancolombia/__init__.py`
- [x] Actualizar `procesador_archivos_service.py` para usar los nuevos extractores
- [x] Verificar que el tipo de cuenta existe en la BD

### Refactorización de Nombres de Cuenta
- [x] Renombrar cuentas en BD (usuario completó)
- [x] Actualizar backend para usar nuevos nombres
- [x] Actualizar frontend para usar cuenta.nombre directamente
- [x] Implementar lógica especial para MasterCard (Opción A)
- [x] Limpiar referencias antiguas en documentación y comentarios

### Verificación
- [x] Verificar que no queden referencias a nombres antiguos
- [ ] Probar carga de extracto Mastercard en pesos
- [ ] Probar carga de extracto Mastercard en dólares
- [ ] Verificar que los datos se guardan correctamente en `conciliaciones`
- [ ] Crear documento de walkthrough con resultados
