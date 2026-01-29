import { RotateCcw } from 'lucide-react'
import { SelectorCuenta } from '../molecules/SelectorCuenta'
import { Button } from '../atoms/Button'
import { DateRangeButtons, DateRangeInputs } from '../molecules/DateRangeSelector'
import { ClassificationFilters } from '../molecules/ClassificationFilters'
import { FilterToggles } from '../molecules/FilterToggles'
import type { Tercero, CentroCosto, Concepto } from '../../types'
import type { ConfigFiltroExclusion } from '../../types/filters'

interface FiltrosReporteProps {
    desde: string
    hasta: string
    onDesdeChange: (val: string) => void
    onHastaChange: (val: string) => void
    cuentaId: string
    onCuentaChange: (val: string) => void
    terceroId?: string
    onTerceroChange?: (val: string) => void
    centroCostoId?: string
    onCentroCostoChange?: (val: string) => void
    conceptoId?: string
    onConceptoChange?: (val: string) => void
    terceros?: Tercero[]
    centrosCostos?: CentroCosto[]
    conceptos?: Concepto[]
    onLimpiar: () => void
    showClasificacionFilters?: boolean
    showIngresosEgresos?: boolean
    mostrarIngresos?: boolean
    onMostrarIngresosChange?: (val: boolean) => void
    mostrarEgresos?: boolean
    onMostrarEgresosChange?: (val: boolean) => void
    configuracionExclusion?: ConfigFiltroExclusion[]
    centrosCostosExcluidos?: number[]
    onCentrosCostosExcluidosChange?: (val: number[]) => void
    soloConciliables?: boolean
}

export const FiltrosReporte = ({
    desde,
    hasta,
    onDesdeChange,
    onHastaChange,
    cuentaId,
    onCuentaChange,
    terceroId,
    onTerceroChange,
    centroCostoId,
    onCentroCostoChange,
    conceptoId,
    onConceptoChange,
    terceros = [],
    centrosCostos = [],
    conceptos = [],
    onLimpiar,
    showClasificacionFilters = false,
    showIngresosEgresos = true,
    mostrarIngresos = true,
    onMostrarIngresosChange,
    mostrarEgresos = true,
    onMostrarEgresosChange,
    configuracionExclusion = [],
    centrosCostosExcluidos = [],
    onCentrosCostosExcluidosChange,
    soloConciliables = true
}: FiltrosReporteProps) => {

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 transition-all hover:shadow-md space-y-3">

            {/* Fila 1: Botones de Rango de Fecha */}
            <div className="pb-2">
                <DateRangeButtons onDesdeChange={onDesdeChange} onHastaChange={onHastaChange} />
            </div>

            {/* Fila 2: Inputs de Fecha y Selector de Cuenta en una sola fila */}
            <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-grow">
                    <DateRangeInputs
                        desde={desde}
                        hasta={hasta}
                        onDesdeChange={onDesdeChange}
                        onHastaChange={onHastaChange}
                    />
                </div>
                <div className="w-full lg:w-1/3">
                    <SelectorCuenta
                        value={cuentaId}
                        onChange={onCuentaChange}
                        soloConciliables={soloConciliables}
                        showTodas={true}
                    />
                </div>
            </div>

            {/* Fila 3: Clasificadores (si aplica) */}
            {showClasificacionFilters && (
                <div className="pt-2">
                    <ClassificationFilters
                        terceroId={terceroId}
                        onTerceroChange={onTerceroChange}
                        centroCostoId={centroCostoId}
                        onCentroCostoChange={onCentroCostoChange}
                        conceptoId={conceptoId}
                        onConceptoChange={onConceptoChange}
                        terceros={terceros}
                        centrosCostos={centrosCostos}
                        conceptos={conceptos}
                    />
                </div>
            )}

            {/* Line 4: Checkboxes & Clear Button */}
            <div className="flex flex-col md:flex-row justify-between items-center pt-3 mt-1 border-t border-gray-100 gap-2">
                <div className="flex-grow">
                    <FilterToggles

                        mostrarIngresos={mostrarIngresos}
                        onMostrarIngresosChange={onMostrarIngresosChange}
                        mostrarEgresos={mostrarEgresos}
                        onMostrarEgresosChange={onMostrarEgresosChange}
                        showIngresosEgresos={showIngresosEgresos}

                        configuracionExclusion={configuracionExclusion}
                        centrosCostosExcluidos={centrosCostosExcluidos}
                        onCentrosCostosExcluidosChange={onCentrosCostosExcluidosChange}
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
