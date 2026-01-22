# Plan: Afinar Extracción de Extractos MasterCard

## Problema Identificado

Al intentar cargar un extracto de MasterCard Pesos (imagen 1), se presenta un error 500 (imagen 2). El error indica que no se pudo extraer el resumen del archivo en la línea 44 de `pesos_extracto.py`.

![Error UI](file:///C:/Users/Slb/.gemini/antigravity/brain/838b4617-8b9c-44ec-83a3-b931bf2abcd9/uploaded_image_0_1768591981448.png)

![Error Backend](file:///C:/Users/Slb/.gemini/antigravity/brain/838b4617-8b9c-44ec-83a3-b931bf2abcd9/uploaded_image_1_1768591981448.png)

## Análisis

1. **Diferenciación Pesos/USD**: Actualmente el sistema diferencia entre MasterCardPesos y MasterCardUSD en dos lugares:
   - En los extractores individuales: `mastercard_pesos_extracto.py` busca "Moneda: PESOS" y `mastercard_usd_extracto.py` busca "Moneda: DOLARES"
   - En el servicio: `procesador_archivos_service.py` llama al extractor correcto según `tipo_cuenta`

2. **El error**: La línea 44 arroja la excepción porque no se encontró `saldo_final` en el resumen extraído. Esto significa que los patrones regex no están capturando los datos del PDF.

## Causa Raíz

Los patrones regex en `mastercard_pesos_extracto.py` están diseñados para un formato específico de PDF, pero el PDF real puede tener:
- Variaciones en el texto (espacios extras, saltos de línea diferentes)
- Formato diferente de los campos
- Texto normalizado de manera diferente

## Propuesta de Solución

### 1. Agregar Debug Logging

Añadir logging temporal en `mastercard_pesos_extracto.py` para:
- Capturar el texto completo extraído del PDF
- Ver qué secciones del texto se están procesando
- Identificar por qué los regex no están haciendo match

### 2. Ajustar Patrones Regex

Una vez visto el texto real:
- Ajustar los patrones regex para que sean más flexibles
- Considerar variaciones en espaciado y formato
- Asegurar que la búsqueda de "Moneda: PESOS" funcione correctamente

### 3. Validación

- Probar con el PDF real (`2025-12 7796.pdf`)
- Confirmar que extrae todos los valores correctamente
- Verificar que la diferenciación Pesos/USD funciona según la cuenta seleccionada

## Archivos a Modificar

### [MODIFY] [mastercard_pesos_extracto.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/backend/src/infrastructure/extractors/bancolombia/mastercard_pesos_extracto.py)

- Agregar logging para capturar el texto extraído
- Ajustar regex patterns según el formato real
- Mejorar manejo de errores para dar más contexto

### Posiblemente [MODIFY] [mastercard_usd_extracto.py](file:///f:/1.%20Cloud/4.%20AI/1.%20Antigravity/ConciliacionWeb/backend/src/infrastructure/extractors/bancolombia/mastercard_usd_extracto.py)

- Aplicar los mismos fixes si son necesarios

## Verificación Plan

1. **Capturar formato real del PDF**
   - Agregar logging detallado
   - Intentar cargar el extracto nuevamente
   - Revisar logs para ver el texto extraído

2. **Ajustar extractores**
   - Modificar regex patterns
   - Mejorar robustez del parsing

3. **Prueba funcional**
   - Subir el extracto nuevamente
   - Confirmar que no hay error 500
   - Validar que los valores extraídos son correctos

> [!IMPORTANT]
> La diferenciación entre MasterCardPesos y MasterCardUSD **ya funciona correctamente** basándose en la cuenta seleccionada. El servicio recibe `tipo_cuenta` del frontend y llama al extractor apropiado. El problema actual es que el extractor de Pesos no puede parsear el PDF, no que se esté usando el extractor incorrecto.
