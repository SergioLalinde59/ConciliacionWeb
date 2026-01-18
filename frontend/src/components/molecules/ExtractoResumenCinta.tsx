import React from 'react'

interface ExtractoStatsProps {
    totalLeidos: number
    totalDuplicados: number
    totalNuevos: number
}

export const ExtractoResumenCinta: React.FC<ExtractoStatsProps & { labelNuevos?: string }> = ({
    totalLeidos,
    totalDuplicados,
    totalNuevos,
    labelNuevos
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Card 1: Registros Leídos (Blue) */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center justify-center h-24">
                <span className="text-4xl font-bold text-blue-600 leading-none mb-1">
                    {totalLeidos}
                </span>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    REGISTROS LEÍDOS
                </span>
            </div>

            {/* Card 2: Duplicados (Orange/Amber) */}
            <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 shadow-sm flex flex-col items-center justify-center h-24">
                <span className="text-4xl font-bold text-orange-600 leading-none mb-1">
                    {totalDuplicados}
                </span>
                <span className="text-xs text-orange-800 font-semibold uppercase tracking-wider">
                    DUPLICADOS
                </span>
            </div>

            {/* Card 3: A Cargar (Green) */}
            <div className="bg-green-50 rounded-xl border border-green-100 p-4 shadow-sm flex flex-col items-center justify-center h-24">
                <span className="text-4xl font-bold text-green-600 leading-none mb-1">
                    {totalNuevos}
                </span>
                <span className="text-xs text-green-800 font-semibold uppercase tracking-wider">
                    {labelNuevos || 'A CARGAR'}
                </span>
            </div>
        </div>
    )
}
