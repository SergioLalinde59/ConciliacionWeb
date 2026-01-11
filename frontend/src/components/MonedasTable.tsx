import { Pencil, Trash2 } from 'lucide-react'
import type { Moneda } from '../types'

interface Props {
    monedas: Moneda[]
    loading: boolean
    onEdit: (moneda: Moneda) => void
    onDelete: (id: number) => void
}

export const MonedasTable = ({ monedas, loading, onEdit, onDelete }: Props) => {
    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando monedas...</div>
    }

    if (monedas.length === 0) {
        return <div className="p-8 text-center text-gray-500">No hay monedas registradas.</div>
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">ID</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">ISO</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre Moneda</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-32">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {monedas.map((moneda) => (
                        <tr key={moneda.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 text-sm text-gray-600 font-mono">#{moneda.id}</td>
                            <td className="py-3 px-4 text-sm font-bold text-gray-700">{moneda.isocode}</td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">{moneda.nombre}</td>
                            <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(moneda)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('¿Estás seguro de eliminar esta moneda?')) {
                                                onDelete(moneda.id)
                                            }
                                        }}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
