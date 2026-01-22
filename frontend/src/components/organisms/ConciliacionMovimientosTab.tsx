import React, { useState, useEffect } from 'react';
import { DataTable } from '../molecules/DataTable';
import { conciliacionService } from '../../services/conciliacionService';
import { CurrencyDisplay } from '../atoms/CurrencyDisplay';

import type { MovimientoExtracto } from '../../types/Conciliacion';
import type { Movimiento } from '../../types';

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
    const [movimientosExtracto, setMovimientosExtracto] = useState<MovimientoExtracto[]>([]);
    const [movimientosSistema, setMovimientosSistema] = useState<Movimiento[]>([]);
    const [matches, setMatches] = useState<any[]>([]); // Using any for simplicity as matching types are extensive

    useEffect(() => {
        loadData();
    }, [cuentaId, year, month]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, movsExtracto, movsSistema, matchResult] = await Promise.all([
                conciliacionService.compararMovimientos(cuentaId, year, month),
                conciliacionService.obtenerMovimientosExtracto(cuentaId, year, month),
                conciliacionService.obtenerMovimientosSistema(cuentaId, year, month),
                conciliacionService.obtenerMatches(cuentaId, year, month)
            ]);
            setStats(statsData);
            setMovimientosExtracto(movsExtracto);
            setMovimientosSistema(movsSistema);
            setMatches(matchResult.matches || []);
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

    // Calcular si mostramos columnas USD
    const showUsd = (stats.sistema.ingresos_usd !== undefined && Math.abs(stats.sistema.ingresos_usd || 0) > 0) ||
        (stats.sistema.egresos_usd !== undefined && Math.abs(stats.sistema.egresos_usd || 0) > 0) ||
        (stats.extracto.ingresos_usd !== undefined && Math.abs(stats.extracto.ingresos_usd || 0) > 0) ||
        (stats.extracto.egresos_usd !== undefined && Math.abs(stats.extracto.egresos_usd || 0) > 0);

    // --- Dynamic Card Ordering ---
    // Rule: First card has max total movements. Second is the other. Difference is always third.
    const extractoCount = stats.extracto.total;
    const sistemaCount = stats.sistema.total;

    // Determine order: 'extracto' | 'sistema'
    const firstCard = extractoCount >= sistemaCount ? 'extracto' : 'sistema';

    const renderCard = (type: 'extracto' | 'sistema' | 'diferencias') => {
        if (type === 'extracto') {
            return (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 text-left">Extracto</h3>
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
            );
        } else if (type === 'sistema') {
            return (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 text-left">Sistema</h3>
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
            );
        } else {
            return (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-purple-500"></div>
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 text-left">Diferencias</h3>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Movimientos</span>
                            <span className={`font-medium ${stats.diferencias.total_movimientos !== 0 ? 'text-purple-600 font-bold' : ''}`}>
                                {stats.diferencias.total_movimientos}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Ingresos</span>
                            <span className={`font-medium ${stats.diferencias.ingresos !== 0 ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                                <CurrencyDisplay value={stats.diferencias.ingresos} />
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Egresos</span>
                            <span className={`font-medium ${stats.diferencias.egresos !== 0 ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                                <CurrencyDisplay value={stats.diferencias.egresos} />
                            </span>
                        </div>
                        {showUsd && (
                            <>
                                <div className="border-t border-gray-100 my-2 pt-2"></div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Ingresos USD</span>
                                    <span className="font-medium text-purple-600 text-sm"><CurrencyDisplay value={stats.diferencias.ingresos_usd || 0} currency="USD" /></span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Egresos USD</span>
                                    <span className="font-medium text-purple-600 text-sm"><CurrencyDisplay value={stats.diferencias.egresos_usd || 0} currency="USD" /></span>
                                </div>
                            </>
                        )}
                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-800">Saldo Neto</span>
                            <div className="text-right">
                                {showUsd && <div className="text-purple-600 font-bold text-lg"><CurrencyDisplay value={stats.diferencias.saldo_neto_usd || 0} currency="USD" /></div>}
                                <div className={`text-sm ${showUsd ? 'text-gray-500' : 'font-bold text-purple-700 text-lg'}`}><CurrencyDisplay value={stats.diferencias.saldo_neto} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    };

    // --- Unreconciled / Pending Logic ---
    const linkedExtractIds = new Set(matches.map(m => m.mov_extracto.id));
    const linkedSystemIds = new Set(matches.map(m => m.mov_sistema ? m.mov_sistema.id : -1)); // -1 or null

    // Filter out matched movements
    const pendingExtracto = movimientosExtracto.filter(m => !linkedExtractIds.has(m.id));
    const pendingSistema = movimientosSistema.filter(m => !linkedSystemIds.has(m.id));

    return (
        <div className="space-y-8">
            {/* Cards de Resumen Comparativo (Ordenado Dinámicamente) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderCard(firstCard)}
                {renderCard(firstCard === 'extracto' ? 'sistema' : 'extracto')}
                {renderCard('diferencias')}
            </div>

            {/* Tablas de Pendientes (Diferencias) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pendientes Extracto */}
                <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col">
                    <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-emerald-800">Faltantes en Sistema</h3>
                            <p className="text-xs text-emerald-600">Movimientos del extracto no cruzados</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">{pendingExtracto.length}</span>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[500px]">
                        <DataTable
                            data={pendingExtracto}
                            columns={[
                                { key: 'fecha', header: 'Fecha', accessor: (m) => <span className="text-xs">{m.fecha}</span>, sortable: true },
                                { key: 'descripcion', header: 'Descripción', accessor: (m) => <span className="text-sm line-clamp-2" title={m.descripcion}>{m.descripcion}</span>, sortable: true },
                                { key: 'valor', header: 'Valor', accessor: (m) => <span className={`text-sm font-medium ${m.valor > 0 ? 'text-green-600' : m.valor < 0 ? 'text-red-600' : 'text-blue-600'}`}><CurrencyDisplay value={m.valor} /></span>, align: 'right', sortable: true }
                            ]}
                            getRowKey={(m) => m.id}
                            showActions={false}
                            className="border-none"
                            rounded={false}
                            emptyMessage="Todo conciliado en extracto"
                        />
                    </div>
                </div>

                {/* Pendientes Sistema */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden flex flex-col">
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-blue-800">Faltantes en Extracto</h3>
                            <p className="text-xs text-blue-600">Movimientos del sistema no cruzados</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">{pendingSistema.length}</span>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[500px]">
                        <DataTable
                            data={pendingSistema}
                            columns={[
                                { key: 'fecha', header: 'Fecha', accessor: (m) => <span className="text-xs">{m.fecha}</span>, sortable: true },
                                { key: 'descripcion', header: 'Descripción', accessor: (m) => <span className="text-sm line-clamp-2" title={m.descripcion}>{m.descripcion}</span>, sortable: true },
                                { key: 'valor', header: 'Valor', accessor: (m) => <span className={`text-sm font-medium ${m.valor > 0 ? 'text-green-600' : m.valor < 0 ? 'text-red-600' : 'text-blue-600'}`}><CurrencyDisplay value={m.valor} /></span>, align: 'right', sortable: true }
                            ]}
                            getRowKey={(m) => m.id as number}
                            showActions={false}
                            className="border-none"
                            rounded={false}
                            emptyMessage="Todo conciliado en sistema"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
