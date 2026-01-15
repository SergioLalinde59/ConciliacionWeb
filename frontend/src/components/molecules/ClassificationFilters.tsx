
import { ComboBox } from './ComboBox'

interface ClassificationFiltersProps {
    terceroId?: string
    onTerceroChange?: (value: string) => void
    centroCostoId?: string
    onCentroCostoChange?: (value: string) => void
    conceptoId?: string
    onConceptoChange?: (value: string) => void
    terceros?: Array<{ id: number; nombre: string }>
    centrosCostos?: Array<{ id: number; nombre: string }>
    conceptos?: Array<{ id: number; nombre: string; centro_costo_id?: number }>
}

export const ClassificationFilters = ({
    terceroId = '',
    onTerceroChange,
    centroCostoId = '',
    onCentroCostoChange,
    conceptoId = '',
    onConceptoChange,
    terceros = [],
    centrosCostos = [],
    conceptos = []
}: ClassificationFiltersProps) => {

    if (!onTerceroChange || !onCentroCostoChange || !onConceptoChange) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">1. Tercero</label>
                <ComboBox
                    options={terceros}
                    value={terceroId}
                    onChange={(val) => { onTerceroChange(val); }}
                    placeholder="Todos (Pareto Gral)"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">2. Centro de Costo</label>
                <ComboBox
                    options={centrosCostos}
                    value={centroCostoId}
                    onChange={(val) => { onCentroCostoChange(val); onConceptoChange('') }}
                    placeholder="Todos"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Concepto</label>
                <ComboBox
                    options={centroCostoId ? conceptos.filter(c => c.centro_costo_id === parseInt(centroCostoId)) : conceptos}
                    value={conceptoId}
                    onChange={onConceptoChange}
                    placeholder="Filtrar concepto..."
                />
            </div>
        </div>
    )
}
