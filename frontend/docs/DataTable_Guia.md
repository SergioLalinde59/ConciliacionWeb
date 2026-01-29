# Guía del Componente DataTable

Este documento detalla las características, props y uso del componente reutilizable `DataTable`.

## Ubicación
`src/components/molecules/DataTable.tsx`

## Descripción General
El `DataTable` es un componente robusto diseñado para mostrar datos tabulares con soporte para:
- Ordenamiento (interno y controlado externamente).
- Paginación / Scroll Infinito (vía control externo).
- Encabezados fijos (**Sticky Headers**).
- Acciones (Editar/Eliminar).
- Diseño responsivo y personalizable.

## Props Principales

### Datos y Columnas
| Prop | Tipo | Descripción |
|------|------|-------------|
| `data` | `T[]` | Array de objetos a mostrar. |
| `columns` | `Column<T>[]` | Definición de las columnas (ver sección Columnas). |
| `headerGroups` | `HeaderGroup[]` | (Opcional) Para encabezados agrupados de nivel superior. |
| `getRowKey` | `(row: T) => string/number` | Función para identificar filas únicas (ej: `row => row.id`). |

### Ordenamiento (Sorting)
El componente soporta dos modos:
1.  **Automático**: La tabla ordena los datos internamente.
2.  **Controlado**: El padre maneja el ordenamiento (ideal para APIs o grandes volúmenes).

| Prop | Tipo | Descripción |
|------|------|-------------|
| `defaultSortKey` | `string` | Clave inicial para ordenamiento automático. |
| `sortKey` | `string` | **Controlado**: Clave actual de ordenamiento. |
| `sortDirection` | `'asc' \| 'desc'` | **Controlado**: Dirección actual. |
| `onSort` | `(key, dir) => void` | **Controlado**: Callback al hacer clic en un header. |

### Visualización y Diseño
| Prop | Tipo | Descripción |
|------|------|-------------|
| `stickyHeader` | `boolean` | Fija el encabezado en la parte superior del contenedor. |
| `rowPy` | `string` | Padding vertical de filas. Default `py-3`. Usar `py-1` para tablas densas. |
| `loading` | `boolean` | Muestra spinner de carga. |
| `emptyMessage` | `string` | Texto a mostrar si `data` está vacío. |
| `className` | `string` | Clases CSS extra para el wrapper. |

### Scroll Infinito / Scroll Control
| Prop | Tipo | Descripción |
|------|------|-------------|
| `containerRef` | `RefObject<HTMLDivElement>` | Pasa una ref al `div` contenedor de la tabla (útil para medir scroll). |
| `onScroll` | `UIEventHandler` | Callback para eventos de scroll (para implementar infinite scroll). |

## Definición de Columnas (`Column<T>`)

Cada objeto en el array `columns` puede tener:

```typescript
{
    key: string;              // Identificador único
    header: ReactNode;        // Título visual
    accessor?: (row) => Node; // Función render personalizada (opcional)
    sortKey?: string;         // Campo real por el cual ordenar (si difiere de 'key')
    sortable?: boolean;       // Si se puede ordenar
    width?: string;           // Clase Tailwind de ancho (ej: 'w-20')
    align?: 'left'|'center'|'right';
    cellClassName?: string;   // Clases para la celda <td>
}
```

## Ejemplo de Uso (Completo)

```tsx
<DataTable
    // Datos
    data={movimientos}
    columns={columns}
    getRowKey={(row) => row.id}
    
    // Estado Visual
    loading={isLoading}
    rowPy="py-1" // Tabla compacta
    stickyHeader={true} // Header fijo
    
    // Ordenamiento Controlado
    sortKey={currentSort}
    sortDirection={direction}
    onSort={(key, dir) => handleSort(key, dir)}
    
    // Scroll Infinito
    containerRef={scrollRef}
    onScroll={handleScroll}
/>
```

## Notas de Implementación
- Para que `stickyHeader` funcione correctamente con **infinite scroll**, el `DataTable` debe ser el contenedor que tiene el scroll (`onScroll` y `containerRef` deben pasarse al componente, no a un div padre).
- Si usas columnas complejas (ej: objetos anidados), asegúrate de definir `sortKey` en la columna apuntando al campo plano (ej: columna 'cuenta' -> sortKey 'cuenta_nombre').
