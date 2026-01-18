import React, { useState, useEffect } from 'react';
import { DataTable } from '../molecules/DataTable';
import { conciliacionService } from '../../services/conciliacionService';
import { CurrencyDisplay } from '../atoms/CurrencyDisplay';
import { AlertCircle, ArrowRight, Check } from 'lucide-react';
import type { MovimientoExtracto } from '../../types/Conciliacion';

interface Props {
    cuentaId: number;
    year: number;
    month: number;
}

interface ComparacionData {
    sistema: {
        total: number;
        ingresos: number;
        egresos: number;
        saldo_neto: number;
        ingresos_usd?: number;
        egresos_usd?: number;
        saldo_neto_usd?: number;
    };
    extracto: {
        total: number;
        ingresos: number;
        egresos: number;
        saldo_neto: number;
        ingresos_usd?: number;
        egresos_usd?: number;
        saldo_neto_usd?: number;
    };
    diferencias: {
        total_movimientos: number;
        ingresos: number;
        egresos: number;
        saldo_neto: number;
        ingresos_usd?: number;
        egresos_usd?: number;
        saldo_neto_usd?: number;
    };
}

export const ConciliacionMovimientosTab: React.FC<Props> = ({ cuentaId, year, month }) => {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<ComparacionData | null>(null);
    const [movimientos, setMovimientos] = useState<MovimientoExtracto[]>([]);

    useEffect(() => {
        loadData();
    }, [cuentaId, year, month]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, movsData] = await Promise.all([
                conciliacionService.compararMovimientos(cuentaId, year, month),
                conciliacionService.obtenerMovimientosExtracto(cuentaId, year, month)
            ]);
            setStats(statsData);
            setMovimientos(movsData);
        } catch (error) {
            console.error("Error loading comparacion data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p>Cargando comparación...</p>
            </div>
        );
    }

    if (!stats) {
        return <div className="p-8 text-center text-gray-500">No hay datos de comparación disponibles.</div>;
    }

    // Calcular si mostramos columnas USD (si la respuesta incluye campos USD)
    // Calcular si mostramos columnas USD (si hay valores USD en stats)
    const showUsd = (stats.sistema.ingresos_usd !== undefined && Math.abs(stats.sistema.ingresos_usd) > 0) ||
        (stats.sistema.egresos_usd !== undefined && Math.abs(stats.sistema.egresos_usd) > 0) ||
        (stats.extracto.ingresos_usd !== undefined && Math.abs(stats.extracto.ingresos_usd) > 0) ||
        (stats.extracto.egresos_usd !== undefined && Math.abs(stats.extracto.egresos_usd) > 0);

    return (
        <div className="space-y-8">
            {/* Cards de Resumen Comparativo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Extracto */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Extracto</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Movimientos</span>
                            <span className="font-medium">{stats.extracto.total}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Ingresos</span>
                            <span className="font-medium text-green-600"><CurrencyDisplay value={stats.extracto.ingresos} /></span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Egresos</span>
                            <span className="font-medium text-red-600"><CurrencyDisplay value={stats.extracto.egresos} /></span>
                        </div>
                        {showUsd && (
                            <>
                                <div className="border-t border-gray-100 my-2 pt-2"></div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Ingresos USD</span>
                                    <span className="font-medium text-green-600 text-sm"><CurrencyDisplay value={stats.extracto.ingresos_usd || 0} currency="USD" /></span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Egresos USD</span>
                                    <span className="font-medium text-red-600 text-sm"><CurrencyDisplay value={stats.extracto.egresos_usd || 0} currency="USD" /></span>
                                </div>
                            </>
                        )}
                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-800">Saldo Neto</span>
                            <div className="text-right">
                                {showUsd && <span className="font-bold text-emerald-700 text-lg block"><CurrencyDisplay value={stats.extracto.saldo_neto_usd || 0} currency="USD" /></span>}
                                <span className={`block ${showUsd ? 'text-sm text-gray-500' : 'font-bold text-emerald-700 text-lg'}`}><CurrencyDisplay value={stats.extracto.saldo_neto} /></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Diferencias (Centro) */}
                <div className="flex flex-col justify-center items-center space-y-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${stats.diferencias.total_movimientos === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {stats.diferencias.total_movimientos === 0 ? <Check size={18} /> : <AlertCircle size={18} />}
                        {Math.abs(stats.diferencias.total_movimientos)} Movimientos de diferencia
                    </div>
                    {showUsd && (
                        <div className="text-xs text-gray-400">
                            Dif USD: <CurrencyDisplay value={stats.diferencias.saldo_neto_usd || 0} currency="USD" />
                        </div>
                    )}
                    <ArrowRight className="text-gray-300 hidden md:block" size={32} />
                </div>

                {/* Sistema */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 text-right">Sistema</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Movimientos</span>
                            <span className="font-medium">{stats.sistema.total}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Ingresos</span>
                            <span className="font-medium text-green-600"><CurrencyDisplay value={stats.sistema.ingresos} /></span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Egresos</span>
                            <span className="font-medium text-red-600"><CurrencyDisplay value={stats.sistema.egresos} /></span>
                        </div>
                        {showUsd && (
                            <>
                                <div className="border-t border-gray-100 my-2 pt-2"></div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Ingresos USD</span>
                                    <span className="font-medium text-green-600 text-sm"><CurrencyDisplay value={stats.sistema.ingresos_usd || 0} currency="USD" /></span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Egresos USD</span>
                                    <span className="font-medium text-red-600 text-sm"><CurrencyDisplay value={stats.sistema.egresos_usd || 0} currency="USD" /></span>
                                </div>
                            </>
                        )}
                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-800">Saldo Neto</span>
                            <div className="text-right">
                                {showUsd && <div className="text-blue-600 font-bold text-lg"><CurrencyDisplay value={stats.sistema.saldo_neto_usd || 0} currency="USD" /></div>}
                                <div className={`text-sm ${showUsd ? 'text-gray-500' : 'font-bold text-blue-700 text-lg'}`}><CurrencyDisplay value={stats.sistema.saldo_neto} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de Movimientos del Extracto */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Detalle de Movimientos (Extracto)</h3>
                    <span className="text-sm text-gray-500">{movimientos.length} registros</span>
                </div>

                <DataTable
                    data={movimientos}
                    columns={[
                        {
                            key: 'fecha',
                            header: 'Fecha',
                            accessor: (mov: MovimientoExtracto) => <span className="font-mono text-xs">{mov.fecha}</span>,
                            sortable: true
                        },
                        {
                            key: 'descripcion',
                            header: 'Descripción',
                            accessor: (mov: MovimientoExtracto) => <span className="text-gray-800">{mov.descripcion}</span>,
                            sortable: true
                        },
                        {
                            key: 'referencia',
                            header: 'Referencia',
                            accessor: (mov: MovimientoExtracto) => <span className="font-mono text-xs text-gray-500">{mov.referencia || '-'}</span>,
                            align: 'right',
                            sortable: true
                        },
                        {
                            key: 'valor',
                            header: 'Valor',
                            accessor: (mov: MovimientoExtracto) => (
                                <span className={`font-medium ${mov.valor > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    <CurrencyDisplay value={mov.valor} />
                                </span>
                            ),
                            align: 'right',
                            sortable: true
                        },
                        ...(showUsd ? [{
                            key: 'usd',
                            header: 'USD',
                            accessor: (mov: MovimientoExtracto) => (
                                <span className="font-mono text-xs">
                                    {mov.usd ? <CurrencyDisplay value={mov.usd} currency="USD" /> : '-'}
                                </span>
                            ),
                            align: 'right' as const,
                            sortable: true
                        }, {
                            key: 'trm',
                            header: 'TRM',
                            accessor: (mov: MovimientoExtracto) => (
                                <span className="font-mono text-xs">
                                    {mov.trm ? <CurrencyDisplay value={mov.trm} /> : '-'}
                                </span>
                            ),
                            align: 'right' as const,
                            sortable: true
                        }] : []),
                        {
                            key: 'estado',
                            header: 'Estado',
                            accessor: () => (
                                <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="Pendiente de cruce"></span>
                            ),
                            align: 'center',
                            width: 'w-20'
                        }
                    ]}
                    getRowKey={(mov: MovimientoExtracto) => mov.id || Math.random()}
                    showActions={false}
                    className="border-none rounded-none"
                    rounded={false}
                />
            </div>
        </div>
    );
};
