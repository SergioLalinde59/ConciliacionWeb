# Proceso de Conciliación y Matching Inteligente

Este documento explica detalladamente cómo el sistema procesa los movimientos bancarios y del sistema para lograr una conciliación efectiva.

## 1. El Proceso de Matching (Asignación)

El sistema utiliza un **Algoritmo de Matching Ponderado** para vincular movimientos del extracto con los del sistema. El proceso sigue estos pasos:

### Criterios de Comparación
Para cada movimiento del extracto, el sistema busca candidatos en el sistema basándose en:
- **Fecha**: Busca movimientos en la misma fecha o con una diferencia de ±1 día.
- **Valor**: Compara los montos. Existe una **tolerancia de valor** configurable (por defecto suele ser cercana a 0 para coincidencia exacta).
- **Descripción (Matching Inteligente)**: Se utiliza lógica de "Normalización" o "Alias":
    1. Se toma la descripción del **extracto**.
    2. Si coincide con una **Regla de Normalización** (Alias), se "traduce" a la descripción esperada en el sistema.
    3. Se compara esta descripción traducida contra la descripción real en el sistema mediante un algoritmo de similitud de texto.

### Estados de la Vinculación
- **OK (Exacto)**: El score de coincidencia es máximo (fecha, valor y descripción coinciden o son altamente similares). El sistema los vincula automáticamente.
- **PROBABLE**: Existe una coincidencia fuerte en fecha y valor, pero la descripción es diferente. Estos requieren revisión manual del usuario.
- **SIN_MATCH**: No se encontró ningún movimiento que cumpla con los criterios mínimos.
- **MANUAL**: Vinculaciones creadas explícitamente por el usuario en la interfaz.

---

## 2. ¿Cómo sabe el sistema si la cuenta está "Cuadrada" o "Conciliada"?

Existen dos niveles de validación matemática en el sistema:

### A. Cuenta "Cuadrada" (Consistencia Interna del Extracto)
Se refiere a que los datos informados en el extracto bancario tengan sentido contable por sí mismos.
- **Fórmula**: `Saldo Anterior + Entradas - Salidas = Saldo Final (Extracto)`.
- Si esta igualdad se cumple (con una tolerancia de 0.01), el sistema considera que el extracto está **cuadrado**.

### B. Cuenta "Conciliada" (Coincidencia Sistema vs Extracto)
Se refiere a que la realidad financiera del sistema coincide con la del banco. El sistema lo determina comparando los **Saldos Finales**.
- **Indicador Clave**: `Diferencia de Saldo = Saldo Final (Sistema) - Saldo Final (Extracto)`.
- Si la `Diferencia de Saldo` es **cero** (o menor a 0.01), la cuenta está **conciliada**.
- En términos prácticos, esto significa que:
    1. Todas las **Entradas** del sistema coinciden con las del extracto.
    2. Todas las **Salidas** del sistema coinciden con las del extracto.
    3. El **Saldo Final** resultante es idéntico en ambas fuentes.

---

## 3. Actualización de la Tabla de Conciliación

La tabla `conciliaciones` es el resumen central de cada periodo (Cuenta, Año, Mes). Se actualiza en los siguientes momentos:

### ¿Dónde se actualiza?
- **Backend (Servicios)**: A través del `PostgresConciliacionRepository`.
- **Base de Datos (Transacciones)**: La diferencia de saldo (`diferencia_saldo`) es una **columna generada** automáticamente por la base de datos cada vez que cambian los totales.

### ¿Cada cuánto/Cuándo se actualiza?
1. **Al Cargar un Extracto**: Cuando subes un archivo, el sistema crea o actualiza la fila correspondiente con los totales del banco (Saldo Anterior, Entradas, Salidas, Saldo Final).
2. **Auto-Sincronización (Al Consultar)**: Cada vez que abres la página de conciliación, el sistema ejecuta una validación rápida. Si detecta que sumando los movimientos individuales del extracto los totales no coinciden con lo guardado en la tabla de resumen, **se actualiza automáticamente** para asegurar integridad.
3. **Recalcular Sistema**: Cuando se visualiza el detalle o se termina un proceso de matching, el sistema suma todos los movimientos registrados en la tabla `movimientos` para ese periodo y actualiza los campos `sistema_entradas`, `sistema_salidas` y `sistema_saldo_final`.
4. **Al Confirmar Matches**: Las vinculaciones manuales o confirmaciones de matches probables pueden disparar recalculaciones de los totales del sistema para reflejar el estado actual.

> El sistema siempre toma el **Saldo Anterior del Extracto** como punto de partida para calcular el **Saldo Final del Sistema**. De esta forma, la diferencia final refleja puramente las discrepancias en los movimientos del mes.

---

## 4. El Algoritmo "Semáforo" y Estados Automáticos

El sistema gestiona el estado de la conciliación basándose en el balance y la aprobación del usuario.

### Estados del Semáforo
| Estado | Color | Condición | Efecto |
| :--- | :--- | :--- | :--- |
| **PENDIENTE** | 🔴 Rojo | Diferencia ≠ $0.00 o falta clasificar. | Abierto para cambios. |
| **CUADRADO** | 🟡 Amarillo | Balance Perfecto + 100% Vinculado + 1:1 | Habilita botón de Cierre. |
| **CONCILIADO** | 🟢 Verde | Registro validado y firmado por usuario | **BLOQUEADO**. Protegido. |

### Criterios Estrictos de Cuadre (🟡)
Para que una cuenta se considere **Cuadrada**, el sistema valida en tiempo real:
1.  **Balance de Masas**: La suma de Ingresos del Sistema coincide con Ingresos del Extracto (y lo mismo con Egresos).
2.  **Procesamiento Total**: Cero movimientos del extracto en estado `SIN_MATCH` o `PROBABLE`.
3.  **Integridad 1-a-1**: Cada movimiento del extracto debe corresponder exactamente a **un** registro del sistema. No se permiten agrupaciones (n-a-1) para el cierre automático.

### Reglas de Integridad (Bloqueo)
Una vez que el usuario presiona **"Aprobar y Cerrar"** en un periodo cuadrado:
1.  **Extracto**: Los saldos del extracto son definitivos (siempre lo son, ya que se cargan de PDF).
2.  **Movimientos del Sistema**: Se bloquea la creación, edición o eliminación de cualquier movimiento cuya fecha pertenezca al periodo conciliado.
3.  **Matching**: Se deshabilitan las acciones de vincular, desvincular o crear movimientos desde el extracto.

> [!WARNING]
> Para modificar un periodo **CONCILIADO**, se requiere que un administrador cambie el estado en la base de datos (actualmente no hay "Reabrir" en la UI por seguridad).

---

## 5. Resumen de Flujo de Datos
1.  **Carga**: PDF -> Extractores -> `movimientos_extracto` + `conciliaciones` (Estado: PENDIENTE).
2.  **Sincronización**: El usuario clasifica movimientos del sistema para igualar los totales del extracto.
3.  **Cuadre**: Al llegar a Diferencia $0.00, el sistema marca el periodo como **CUADRADO** (Amarillo).
4.  **Cierre**: El usuario revisa y presiona **"Aprobar"**. El estado cambia a **CONCILIADO** (Verde) y el periodo se bloquea.
