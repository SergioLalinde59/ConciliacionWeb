
import { ComboBox } from './ComboBox'

interface ClassificationFiltersProps {
    terceroId?: string
    onTerceroChange?: (value: string) => void
    grupoId?: string
    onGrupoChange?: (value: string) => void
    conceptoId?: string
    onConceptoChange?: (value: string) => void
    terceros?: Array<{ id: number; nombre: string }>
    grupos?: Array<{ id: number; nombre: string }>
    conceptos?: Array<{ id: number; nombre: string; grupo_id?: number }>
}

export const ClassificationFilters = ({
    terceroId = '',
    onTerceroChange,
    grupoId = '',
    onGrupoChange,
    conceptoId = '',
    onConceptoChange,
    terceros = [],
    grupos = [],
    conceptos = []
}: ClassificationFiltersProps) => {

    if (!onTerceroChange || !onGrupoChange || !onConceptoChange) return null;

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
                <label className="text-xs font-semibold text-gray-500 uppercase">2. Grupo</label>
                <ComboBox
                    options={grupos}
                    value={grupoId}
                    onChange={(val) => { onGrupoChange(val); onConceptoChange('') }}
                    placeholder="Todos"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Concepto (Opcional)</label>
                <ComboBox
                    options={grupoId ? conceptos.filter(c => c.grupo_id === parseInt(grupoId)) : conceptos}
                    value={conceptoId}
                    onChange={onConceptoChange}
                    placeholder="Filtrar concepto..."
                />
            </div>
        </div>
    )
}
