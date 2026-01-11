import { RotateCcw, CreditCard } from 'lucide-react'
import { Select } from './atoms/Select'
import { Button } from './atoms/Button'
import { DateRangeButtons, DateRangeInputs } from './molecules/DateRangeSelector'
import { ClassificationFilters } from './molecules/ClassificationFilters'
import { FilterToggles } from './molecules/FilterToggles'

export interface FiltrosReporteProps {
    // Date filters
    desde: string
    hasta: string
    onDesdeChange: (value: string) => void
    onHastaChange: (value: string) => void

    // Account filter
    cuentaId: string
    onCuentaChange: (value: string) => void
    cuentas: Array<{ id: number; nombre: string }>

    // Dynamic Exclusion Filters - ALL exclusion filters come from here
    configuracionExclusion?: Array<{ grupo_id: number; etiqueta: string }>;
    gruposExcluidos?: number[];
    onGruposExcluidosChange?: (ids: number[]) => void

    // Pending classification filter
    soloPendientes?: boolean
    onSoloPendientesChange?: (value: boolean) => void
    showSoloPendientes?: boolean

    // Classification filters
    terceroId?: string
    onTerceroChange?: (value: string) => void
    grupoId?: string
    onGrupoChange?: (value: string) => void
    conceptoId?: string
    onConceptoChange?: (value: string) => void
    terceros?: Array<{ id: number; nombre: string }>
    grupos?: Array<{ id: number; nombre: string }>
    conceptos?: Array<{ id: number; nombre: string; grupo_id?: number }>
    showClasificacionFilters?: boolean

    // Income/Expense filters
    mostrarIngresos?: boolean
    mostrarEgresos?: boolean
    onMostrarIngresosChange?: (value: boolean) => void
    onMostrarEgresosChange?: (value: boolean) => void
    showIngresosEgresos?: boolean

    // Clear handler
    onLimpiar: () => void
}

export const FiltrosReporte = ({
    desde,
    hasta,
    onDesdeChange,
    onHastaChange,
    cuentaId,
    onCuentaChange,
    cuentas,
    soloPendientes = false,
    onSoloPendientesChange,
    showSoloPendientes = false,
    terceroId = '',
    onTerceroChange,
    grupoId = '',
    onGrupoChange,
    conceptoId = '',
    onConceptoChange,
    terceros = [],
    grupos = [],
    conceptos = [],
    showClasificacionFilters = false,
    mostrarIngresos = true,
    mostrarEgresos = true,
    onMostrarIngresosChange,
    onMostrarEgresosChange,
    showIngresosEgresos = false,

    gruposExcluidos = [],
    onGruposExcluidosChange,
    configuracionExclusion = [],
    onLimpiar
}: FiltrosReporteProps) => {

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 transition-all hover:shadow-md space-y-3">

            {/* Line 1: Quick Date Buttons */}
            <DateRangeButtons
                onDesdeChange={onDesdeChange}
                onHastaChange={onHastaChange}
            />

            {/* Line 2: Date Inputs & Account (Grid 3 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DateRangeInputs
                    desde={desde}
                    hasta={hasta}
                    onDesdeChange={onDesdeChange}
                    onHastaChange={onHastaChange}
                />

                <Select
                    label="Cuenta"
                    icon={CreditCard}
                    value={cuentaId}
                    onChange={(e) => onCuentaChange(e.target.value)}
                    options={[
                        { value: '', label: 'Todas' },
                        ...cuentas.map(c => ({ value: c.id, label: c.nombre }))
                    ]}
                />
            </div>

            {/* Line 3: Classification Filters (Row) */}
            {showClasificacionFilters && (
                <div>
                    <ClassificationFilters
                        terceroId={terceroId}
                        onTerceroChange={onTerceroChange}
                        grupoId={grupoId}
                        onGrupoChange={onGrupoChange}
                        conceptoId={conceptoId}
                        onConceptoChange={onConceptoChange}
                        terceros={terceros}
                        grupos={grupos}
                        conceptos={conceptos}
                    />
                </div>
            )}

            {/* Line 4: Checkboxes & Clear Button */}
            <div className="flex flex-col md:flex-row justify-between items-center pt-3 mt-1 border-t border-gray-100 gap-2">
                <div className="flex-grow">
                    <FilterToggles
                        soloPendientes={soloPendientes}
                        onSoloPendientesChange={onSoloPendientesChange}
                        showSoloPendientes={showSoloPendientes}
                        mostrarIngresos={mostrarIngresos}
                        onMostrarIngresosChange={onMostrarIngresosChange}
                        mostrarEgresos={mostrarEgresos}
                        onMostrarEgresosChange={onMostrarEgresosChange}
                        showIngresosEgresos={showIngresosEgresos}

                        configuracionExclusion={configuracionExclusion}
                        gruposExcluidos={gruposExcluidos}
                        onGruposExcluidosChange={onGruposExcluidosChange}
                    />
                </div>
                <div>
                    <Button variant="ghost" size="sm" onClick={onLimpiar} icon={RotateCcw}>
                        Limpiar Filtros
                    </Button>
                </div>
            </div>
        </div>
    )
}
