import type { Movimiento } from '../types'
import { CurrencyDisplay } from './atoms/CurrencyDisplay'

interface Props {
    movimientos: Movimiento[]
    loading: boolean
    onClasificar: (mov: Movimiento) => void
}

export const MovementsTable = ({ movimientos, loading, onClasificar }: Props) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4 font-semibold">Fecha</th>
                        <th className="px-6 py-4 font-semibold">Descripción</th>
                        <th className="px-6 py-4 font-semibold">Referencia</th>
                        <th className="px-6 py-4 font-semibold text-right">Valor</th>
                        <th className="px-6 py-4 font-semibold">Estado</th>
                        <th className="px-6 py-4 font-semibold">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                Cargando datos...
                            </td>
                        </tr>
                    ) : movimientos.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                No hay movimientos pendientes.
                            </td>
                        </tr>
                    ) : movimientos.map((mov) => (
                        <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{mov.fecha}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{mov.descripcion}</td>
                            <td className="px-6 py-4 text-xs text-gray-500 font-mono">{mov.referencia || '-'}</td>
                            <td className="px-6 py-4 text-right font-mono">
                                <CurrencyDisplay value={Number(mov.valor)} className="font-bold" />
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Pendiente
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <button
                                    onClick={() => onClasificar(mov)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Clasificar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
