import { Pencil, Trash2 } from 'lucide-react'
import type { TipoMovimiento } from '../types'

interface Props {
    tipos: TipoMovimiento[]
    loading: boolean
    onEdit: (tipo: TipoMovimiento) => void
    onDelete: (id: number) => void
}

export const TiposMovimientoTable = ({ tipos, loading, onEdit, onDelete }: Props) => {
    if (loading) return <div className="p-8 text-center text-gray-500">Cargando tipos...</div>
    if (tipos.length === 0) return <div className="p-8 text-center text-gray-500">No hay tipos registrados.</div>

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">ID</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo de Movimiento</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-32">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {tipos.map((tipo) => (
                        <tr key={tipo.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 text-sm text-gray-600 font-mono">#{tipo.id}</td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">{tipo.nombre}</td>
                            <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => onEdit(tipo)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Pencil size={16} /></button>
                                    <button onClick={() => { if (confirm('¿Eliminar?')) onDelete(tipo.id) }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
