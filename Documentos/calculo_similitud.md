# Cálculo del Score de Similitud - Conciliación Automática

El sistema utiliza un algoritmo de matching ponderado para comparar los movimientos del extracto bancario contra los movimientos registrados en el sistema contable. El objetivo es asignar una puntuación de similitud (score) entre 0.00 y 1.00 para determinar si dos registros corresponden a la misma transacción.

> **Nota Importante:** Los pesos y umbrales aquí descritos corresponden a la configuración actual activa en la base de datos (ID: 1).

## Componentes del Score

El score total es una suma ponderada de tres componentes principales:

1.  **Score de Fecha (Peso: 10%)**
2.  **Score de Valor (Peso: 30%)**
3.  **Score de Descripción (Peso: 60%)**

Siendo la fórmula general:

$$ ScoreTotal = (ScoreFecha \times 0.10) + (ScoreValor \times 0.30) + (ScoreDescripción \times 0.60) $$

### 1. Score de Fecha (10%)

Compara la fecha de la transacción del extracto contra la fecha del sistema.

*   Si las fechas son **idénticas**: Score = **1.00**
*   Si las fechas son **diferentes**: Score = **0.00**

> *Nota: El sistema filtra previamente y solo considera candidatos con una diferencia máxima de +/- 1 día.*

### 2. Score de Valor (30%)

Compara el importe monetario de las transacciones, permitiendo una pequeña tolerancia.

*   Si la diferencia es **0**: Score = **1.00**
*   Si la diferencia es mayor a la tolerancia: Score = **0.00**
*   Si la diferencia es pequeña (dentro de la tolerancia): Se calcula proporcionalmente.
    *   `Score = 1.00 - (Diferencia / Tolerancia)`

### 3. Score de Descripción (60%)

Analiza la similitud textual entre la descripción del extracto y la del sistema. Este es el componente con **mayor peso** en la configuración actual.

1.  **Normalización**: Ambos textos se convierten a mayúsculas y se eliminan espacios extremos.
2.  **Algoritmo**: Se utiliza `SequenceMatcher` (basado en el algoritmo de Ratcliff/Obershelp).
3.  **Resultado**: Un valor entre 0.00 y 1.00 indicando qué tan parecidos son los textos.

## Clasificación del Resultado

| Estado | Rango de Score | Acción del Sistema |
| :--- | :--- | :--- |
| **EXACTO** | Score >= **0.95** | Se vincula automáticamente si no hay ambigüedad. |
| **PROBABLE** | **0.70** <= Score < **0.95** | Se sugiere como posible coincidencia para revisión manual. |
| **SIN MATCH** | Score < **0.70** | Se descarta como coincidencia válida. |

## Análisis de Caso (Ejemplo Práctico)

Analicemos cómo cambiaría el score de un movimiento con la configuración antigua (default) vs la actual.

**Caso:**
*   **Extracto**: `26/09/2025` | `RETIRO CAJERO VIVA LA CEJA` | `$ 200.000`
*   **Sistema**: `26/09/2025` | `Transferencia Cta Suc Virtual` | `$ 200.000`
*   **Coincidencias**: Fecha (100%), Valor (100%), Descripción (40%).

### Cálculo con Configuración Anterior (Default)
*   **Pesos**: Fecha 40%, Valor 40%, Descripción 20%
*   `0.40(1.0) + 0.40(1.0) + 0.20(0.40) = 0.40 + 0.40 + 0.08 =` **0.88 (88%)** -> **PROBABLE**

### Cálculo con Configuración ACTUAL
*   **Pesos**: Fecha 10%, Valor 30%, Descripción 60%
*   `0.10(1.0) + 0.30(1.0) + 0.60(0.40) = 0.10 + 0.30 + 0.24 =` **0.64 (64%)** -> **SIN MATCH**

> Con la nueva configuración, este caso específico bajaría de Probable a Sin Match debido a que la descripción (que solo coincide un 40%) ahora tiene mucho más peso (60%), penalizando fuertemente la diferencia en el texto.

## Configuración Técnica Actual

Valores extraídos de la base de datos:

*   **Tolerancia Valor**: $100.00
*   **Similitud Descripción Mínima**: 0.75
*   **Pesos**: [0.10, 0.30, 0.60]
*   **Umbrales**: Probable (0.70), Exacto (0.95)

*Código fuente de referencia: `backend/src/domain/services/matching_service.py` (Lógica) y Base de Datos (Valores).*

## Persistencia del Score (Nota Importante)

El score de similitud se calcula y **se guarda en la base de datos** en el momento en que se ejecuta el proceso de matching.

*   Si cambias la configuración (pesos/tolerancias), los scores de las vinculaciones **ya existentes** NO se actualizan automáticamente.
*   Seguirán mostrando el valor original con el que fueron calculados (ej: 88%).
*   Para actualizar los scores con la nueva configuración, es necesario **desvincular** y volver a ejecutar el proceso de matching.

### Ejemplo Real Detectado
*   **Match (88%)**: Creado a las `17:30:11` con configuración antigua (0.4/0.4/0.2).
*   **Configuración Actual**: Actualizada a las `17:39:13` con nuevos pesos (0.1/0.3/0.6).
*   **Consecuencia**: El registro muestra 88% (histórico), pero si se recalculara hoy daría 64%.

