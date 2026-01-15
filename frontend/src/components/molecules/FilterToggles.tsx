
import { Checkbox } from '../atoms/Checkbox'

interface FilterTogglesProps {
    soloPendientes?: boolean
    onSoloPendientesChange?: (checked: boolean) => void
    showSoloPendientes?: boolean

    mostrarIngresos?: boolean
    onMostrarIngresosChange?: (checked: boolean) => void
    mostrarEgresos?: boolean
    onMostrarEgresosChange?: (checked: boolean) => void
    showIngresosEgresos?: boolean

    // Dynamic Exclusion Filters - ALL exclusion filters come from here
    configuracionExclusion?: Array<{ centro_costo_id: number; etiqueta: string }>;
    centrosCostosExcluidos?: number[];
    onCentrosCostosExcluidosChange?: (ids: number[]) => void;
}

export const FilterToggles = ({
    soloPendientes = false,
    onSoloPendientesChange,
    showSoloPendientes = false,

    mostrarIngresos = true,
    onMostrarIngresosChange,
    mostrarEgresos = true,
    onMostrarEgresosChange,

    showIngresosEgresos = false,

    configuracionExclusion = [],
    centrosCostosExcluidos = [],
    onCentrosCostosExcluidosChange
}: FilterTogglesProps) => {
    return (
        <div className="flex flex-wrap items-center gap-6">
            {/* Por Clasificar (Solo Pendientes) */}
            {showSoloPendientes && onSoloPendientesChange && (
                <Checkbox
                    label="Por Clasificar"
                    checked={!!soloPendientes}
                    onChange={(e) => onSoloPendientesChange(e.target.checked)}
                    className="text-amber-600 focus:ring-amber-500"
                />
            )}

            {/* Dynamic Exclusion Filters - All from config_filtros_grupos */}
            {configuracionExclusion
                .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta))
                .map(config => (
                    <Checkbox
                        key={config.centro_costo_id}
                        label={config.etiqueta}
                        checked={centrosCostosExcluidos.includes(config.centro_costo_id)}
                        onChange={(e) => {
                            const isChecked = e.target.checked
                            const current = centrosCostosExcluidos || []
                            if (isChecked) {
                                onCentrosCostosExcluidosChange?.([...current, config.centro_costo_id])
                            } else {
                                onCentrosCostosExcluidosChange?.(current.filter(id => id !== config.centro_costo_id))
                            }
                        }}
                    />
                ))}

            {/* Income/Expense Filters */}
            {showIngresosEgresos && onMostrarIngresosChange && onMostrarEgresosChange && (
                <>
                    <Checkbox
                        label="Ver Ingresos"
                        checked={!!mostrarIngresos}
                        onChange={(e) => onMostrarIngresosChange(e.target.checked)}
                        className="text-emerald-600"
                    />
                    <Checkbox
                        label="Ver Egresos"
                        checked={!!mostrarEgresos}
                        onChange={(e) => onMostrarEgresosChange(e.target.checked)}
                        className="text-rose-600"
                    />
                </>
            )}
        </div>
    )
}
