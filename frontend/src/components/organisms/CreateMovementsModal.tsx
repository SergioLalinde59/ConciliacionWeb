import { useState } from 'react'
import { X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { MovimientoMatch } from '../../types/Matching'

interface CreateMovementsModalProps {
    sinMatchItems: MovimientoMatch[]
    onClose: () => void
    onConfirm: (items: { movimiento_extracto_id: number, descripcion?: string }[]) => Promise<void>
}

interface GroupedItem {
    descripcion: string
    count: number
    totalValor: number
    ids: number[]
    expanded: boolean
    selected: boolean
}

export const CreateMovementsModal = ({ sinMatchItems, onClose, onConfirm }: CreateMovementsModalProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [groups, setGroups] = useState<GroupedItem[]>(() => {
        // Agrupar por descripción inicial
        const groupedMap = new Map<string, GroupedItem>()

        sinMatchItems.forEach(item => {
            const desc = item.mov_extracto.descripcion.trim()
            if (!groupedMap.has(desc)) {
                groupedMap.set(desc, {
                    descripcion: desc,
                    count: 0,
                    totalValor: 0,
                    ids: [],
                    expanded: false,
                    selected: true // Por defecto seleccionados
                })
            }
            const group = groupedMap.get(desc)!
            group.count++
            group.totalValor += item.mov_extracto.valor
            group.ids.push(item.mov_extracto.id)
        })

        return Array.from(groupedMap.values()).sort((a, b) => b.count - a.count)
    })

    const toggleGroupSelection = (index: number) => {
        const newGroups = [...groups]
        newGroups[index].selected = !newGroups[index].selected
        setGroups(newGroups)
    }

    const toggleGroupExpansion = (index: number) => {
        const newGroups = [...groups]
        newGroups[index].expanded = !newGroups[index].expanded
        setGroups(newGroups)
    }

    const handleConfirm = async () => {
        setIsSubmitting(true)
        try {
            const itemsToCreate: { movimiento_extracto_id: number, descripcion?: string }[] = []

            groups.forEach(group => {
                if (group.selected) {
                    group.ids.forEach(id => {
                        itemsToCreate.push({
                            movimiento_extracto_id: id,
                            descripcion: group.descripcion // Usamos la descripción del grupo (podría editarse luego)
                        })
                    })
                }
            })

            await onConfirm(itemsToCreate)
            onClose()
        } catch (error) {
            console.error("Error creating movements", error)
            alert("Error al crear movimientos")
        } finally {
            setIsSubmitting(false)
        }
    }

    const totalSelected = groups.filter(g => g.selected).reduce((acc, g) => acc + g.count, 0)
    const totalValorSelected = groups.filter(g => g.selected).reduce((acc, g) => acc + g.totalValor, 0)

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Gestionar Faltantes - Crear Movimientos</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Crea movimientos en el sistema para los ítems del extracto sin coincidencia.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">

                    {groups.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No hay ítems sin match para procesar.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Agrupados por descripción idéntica</span>
                                <div className="text-sm text-gray-500">
                                    {totalSelected} ítems seleccionados | Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalValorSelected)}
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={groups.every(g => g.selected)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked
                                                        setGroups(groups.map(g => ({ ...g, selected: checked })))
                                                    }}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción (Extracto)</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Cant.</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Valor Total</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {groups.map((group, index) => (
                                            <tr key={index} className={`hover:bg-gray-50 ${group.selected ? 'bg-blue-50' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={group.selected}
                                                        onChange={() => toggleGroupSelection(index)}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                    {group.descripcion}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-600">
                                                    {group.count}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(group.totalValor)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => toggleGroupExpansion(index)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        {group.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting || totalSelected === 0}
                        className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg transition-colors
                            ${isSubmitting || totalSelected === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 shadow-lg shadow-blue-200'}
                        `}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent"></div>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Crear {totalSelected} Movimientos
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
