import { useState, useMemo, useEffect } from 'react';
import {

    Search,
    CheckCircle2,
    XCircle,
    BarChart3,
    Wallet,
    TrendingUp,
    TrendingDown,
    Unlink,
    AlertCircle
} from 'lucide-react';
import { mantenimientoService } from '../../api/mantenimientoService';
import type { DesvinculacionStats } from '../../api/mantenimientoService';
import { apiService } from '../../services/api';
import type { Movimiento } from '../../types';
import { DataTable, type Column } from '../../components/molecules/DataTable';
import { Button } from '../../components/atoms/Button';
import { SelectorCuenta } from '../../components/molecules/SelectorCuenta';
import { ClassificationDisplay } from '../../components/molecules/entities/ClassificationDisplay';

export const DesvincularMovimientosPage = () => {
    // Estado principal
    const [fecha, setFecha] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');
    const [selectedCuentaId, setSelectedCuentaId] = useState<number | undefined>(undefined);

    // UI State
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [backup, setBackup] = useState(true);
    const [soloClasificados, setSoloClasificados] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [confirmingMassive, setConfirmingMassive] = useState(false);

    // Data State
    const [stats, setStats] = useState<DesvinculacionStats[] | null>(null);
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [loadingMovimientos, setLoadingMovimientos] = useState(false);

    // Selection state for Table
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());


    // Limpiar resultados al cambiar filtros
    useEffect(() => {
        setStats(null);
        setMovimientos([]);
        setSelectedIds(new Set());
        setSuccess(null);
        setError(null);

        // Auto-set fechaFin al último día del mes cuando cambia la fecha de inicio
        if (fecha) {
            const [year, month] = fecha.split('-').map(Number);
            // Para obtener el último día del mes de 'fecha':
            const endDate = new Date(year, month, 0);
            setFechaFin(endDate.toISOString().split('T')[0]);
        }
    }, [fecha, selectedCuentaId]);

    const handleAnalizar = async () => {
        if (!fecha || !fechaFin) return;
        setAnalyzing(true);
        setLoading(true);
        setError(null);
        setSuccess(null);
        setStats(null);
        setMovimientos([]);
        setSelectedIds(new Set());

        try {
            // 1. Obtener estadísticas (bloqueos y totales)
            const statsData = await mantenimientoService.analizarDesvinculacion(fecha, fechaFin, selectedCuentaId);
            setStats(statsData);

            // 2. Obtener lista de movimientos detallada
            setLoadingMovimientos(true);
            const movesResponse = await apiService.movimientos.listar({
                fecha_inicio: fecha,
                fecha_fin: fechaFin,
                cuenta_id: selectedCuentaId,
                pendiente: !soloClasificados,
                limit: 1000
            });
            setMovimientos(movesResponse.items);
            setLoadingMovimientos(false);

        } catch (err: any) {
            setError(err.message || "Error al analizar");
        } finally {
            setLoading(false);
            setAnalyzing(false);
        }
    };

    const handleDesvincularMasivo = async () => {
        if (!fecha || !fechaFin) return;
        setLoading(true);
        setError(null);

        try {
            const result = await mantenimientoService.desvincularMovimientos(fecha, backup, selectedCuentaId, fechaFin);
            setSuccess(result.mensaje);

            // Refresh
            handleAnalizar();
            setConfirmingMassive(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDesvincularUno = async (row: Movimiento) => {
        if (!confirm("¿Estás seguro de desvincular este movimiento? Se reseteará a estado pendiente.")) return;
        setLoading(true);
        try {
            const result = await mantenimientoService.desvincularLote([row.id], backup);
            setSuccess(result.mensaje);
            // Re-analizar para actualizar lista y stats
            handleAnalizar();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDesvincularSeleccion = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        if (!confirm(`¿Estás seguro de desvincular los ${ids.length} movimientos seleccionados?`)) return;

        setLoading(true);
        try {
            const result = await mantenimientoService.desvincularLote(ids, backup);
            setSuccess(result.mensaje);
            setSelectedIds(new Set());
            handleAnalizar();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };



    // Selection Logic
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(movimientos.map(m => m.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) newSelected.add(id);
        else newSelected.delete(id);
        setSelectedIds(newSelected);
    };

    // Stats Calculations
    const totalRecords = stats?.reduce((acc, curr) => acc + curr.conteo, 0) || 0;
    const totalIngresos = stats?.reduce((acc, curr) => acc + curr.ingresos, 0) || 0;
    const totalEgresos = stats?.reduce((acc, curr) => acc + curr.egresos, 0) || 0;
    const totalSaldo = totalIngresos - totalEgresos; // Approx
    const hasBlockedAccounts = stats?.some(s => s.bloqueado);

    // Columns Definition
    const columns = useMemo<Column<Movimiento>[]>(() => [
        {
            key: 'selection',
            header: (
                <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={movimientos.length > 0 && selectedIds.size === movimientos.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={movimientos.length === 0}
                />
            ),
            width: 'w-10',
            align: 'center',
            headerClassName: '!py-2.5 !px-0.5',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedIds.has(row.id)}
                    onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                />
            )
        },
        {
            key: 'fecha',
            header: 'FECHA',
            sortable: true,
            width: 'w-24',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => <span className="text-gray-600 text-xs font-medium">{row.fecha}</span>
        },
        {
            key: 'cuenta',
            header: 'CUENTA',
            sortable: true,
            width: 'w-40',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                <div title={row.cuenta_nombre || ''} className="truncate max-w-[160px] text-xs text-gray-700">
                    <span className="font-bold text-gray-400">{row.cuenta_id}</span>
                    <span className="mx-1 text-gray-300">-</span>
                    {row.cuenta_nombre}
                </div>
            )
        },
        {
            key: 'tercero',
            header: 'TERCERO',
            sortable: true,
            width: 'w-48',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                <div title={row.tercero_nombre || ''} className="truncate max-w-[180px] text-xs text-gray-500">
                    {row.tercero_id ? (
                        <>
                            <span className="font-bold text-gray-400">{row.tercero_id}</span>
                            <span className="text-gray-300">-</span>{row.tercero_nombre}
                        </>
                    ) : (
                        <span className="italic text-gray-300">Sin tercero</span>
                    )}
                </div>
            )
        },
        {
            key: 'clasificacion',
            header: 'CLASIFICACIÓN',
            sortable: true,
            width: 'w-40',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => {
                const details = row.detalles || [];
                const numDetalles = details.length;

                // Logic to support fallback to first detail if top level is missing
                const firstDetail = numDetalles === 1 ? details[0] : null;
                const ccId = row.centro_costo_id || firstDetail?.centro_costo_id;
                const ccNombre = row.centro_costo_nombre || firstDetail?.centro_costo_nombre;
                const conceptId = row.concepto_id || firstDetail?.concepto_id;
                const conceptNombre = row.concepto_nombre || firstDetail?.concepto_nombre;

                return (
                    <ClassificationDisplay
                        centroCosto={ccId ? { id: ccId, nombre: ccNombre || '' } : null}
                        concepto={conceptId ? { id: conceptId, nombre: conceptNombre || '' } : null}
                        detallesCount={numDetalles}
                    />
                );
            }
        },
        {
            key: 'valor',
            header: 'VALOR',
            align: 'right',
            sortable: true,
            width: 'w-28',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                <span className={`font-mono text-xs font-bold ${row.valor < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(row.valor)}
                </span>
            )
        },
        {
            key: 'usd',
            header: 'VALOR USD',
            align: 'right',
            sortable: true,
            width: 'w-24',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => {
                // Logic: Check if account is MasterCard USD or if row has USD value
                const isUSDAccount = row.cuenta_nombre?.toLowerCase().includes('mastercard usd') || row.moneda_nombre === 'USD';
                const showUSD = isUSDAccount || (row.usd && row.usd !== 0);

                if (!showUSD) return <span className="text-gray-300 text-[10px]">-</span>;

                const val = row.usd || 0; // Fallback if isUSDAccount but usd field is null (shouldn't happen often)
                return (
                    <span className={`font-mono text-xs font-bold ${val < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)}
                    </span>
                )
            }
        },
        {
            key: 'trm',
            header: 'TRM',
            align: 'right',
            width: 'w-20',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => row.trm ? <span className="font-mono text-xs text-slate-500">{new Intl.NumberFormat('es-CO').format(row.trm)}</span> : '-'
        },
        {
            key: 'moneda',
            header: 'MONEDA',
            align: 'center',
            width: 'w-16',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => <span className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded">{row.moneda_nombre || 'COP'}</span>
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            width: 'w-10',
            headerClassName: '!py-2.5 !px-0.5',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                <Button
                    variant="ghost-warning"
                    size="sm"
                    onClick={() => handleDesvincularUno(row)}
                    className="!p-1"
                    title="Desvincular Individualmente"
                >
                    <Unlink size={14} />
                </Button>
            )
        }
    ], [selectedIds, movimientos]);

    return (
        <div className="max-w-full mx-auto p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                    <Unlink size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Desvincular Movimientos por Rango</h1>
                    <p className="text-gray-500">Herramienta para reiniciar masivamente movimientos a estado pendiente (sin eliminar)</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

                {/* Filters Board */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
                        />
                    </div>

                    <div className="md:col-span-3 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
                        />
                    </div>

                    <div className="md:col-span-4">
                        <SelectorCuenta
                            value={selectedCuentaId ?? ''}
                            onChange={(val) => setSelectedCuentaId(val ? Number(val) : undefined)}
                            soloConciliables={false}
                            soloPermiteCarga={true}
                            showTodas={true}
                            label="Cuenta Filtro (Opcional)"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <Button
                            onClick={handleAnalizar}
                            disabled={!fecha || !fechaFin || analyzing}
                            className="w-full"
                            variant="primary"
                            icon={Search}
                            isLoading={analyzing}
                        >
                            Analizar
                        </Button>
                    </div>
                </div>

                {/* Feedback Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                        <XCircle className="shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                        <CheckCircle2 className="shrink-0" />
                        {success}
                    </div>
                )}

                {/* Main Content Area */}
                {stats && (
                    <div className="space-y-6 animate-fade-in border-t border-gray-100 pt-6">

                        {/* Stats Ribbon */}
                        <div className="grid grid-cols-2 ml-4 gap-4 lg:grid-cols-4">
                            <StatCard
                                label="Total Registros"
                                value={totalRecords}
                                icon={BarChart3}
                                color="slate"
                            />
                            <StatCard
                                label="Ingresos"
                                value={totalIngresos}
                                icon={TrendingUp}
                                color="emerald"
                                isCurrency
                            />
                            <StatCard
                                label="Egresos"
                                value={totalEgresos}
                                icon={TrendingDown}
                                color="rose"
                                isCurrency
                            />
                            <StatCard
                                label="Balance Neto"
                                value={totalSaldo}
                                icon={Wallet}
                                color={totalSaldo >= 0 ? "blue" : "amber"}
                                isCurrency
                            />
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
                                    Movimientos Encontrados
                                    <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">{movimientos.length}</span>
                                </h3>
                                {selectedIds.size > 0 && (
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                        {selectedIds.size} seleccionados
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-600 hover:text-gray-900 border-r pr-4 border-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={soloClasificados}
                                        onChange={(e) => setSoloClasificados(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    Mostrar Solo Clasificados
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-600 hover:text-gray-900">
                                    <input
                                        type="checkbox"
                                        checked={backup}
                                        onChange={(e) => setBackup(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    Generar Backup Previo
                                </label>

                                {selectedIds.size > 0 ? (
                                    <button
                                        onClick={handleDesvincularSeleccion}
                                        disabled={loading}
                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-2 transition-transform active:scale-95"
                                    >
                                        <Unlink size={16} />
                                        Desvincular Selección ({selectedIds.size})
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setConfirmingMassive(true)}
                                        disabled={hasBlockedAccounts || movimientos.length === 0}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-2 transition-transform active:scale-95"
                                    >
                                        <Unlink size={16} />
                                        Desvincular Todo el Rango
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            <DataTable
                                data={movimientos}
                                columns={columns}
                                getRowKey={(row) => row.id}
                                loading={loadingMovimientos}
                                showActions={false} // We handle actions manually in columns
                                emptyMessage="No hay movimientos para mostrar en este rango."
                                className="border-none"
                                rounded={false}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmingMassive && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border-none max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-amber-500 p-6 text-white flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-full">
                                <AlertCircle className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">¿Confirmar Desvinculación?</h3>
                                <p className="text-amber-100 text-xs font-medium tracking-wide mt-1 opacity-90">
                                    RESET MASIVO DE MOVIMIENTOS
                                </p>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="space-y-4 text-center">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-slate-500 text-sm font-medium">Registros a desvincular:</p>
                                    <p className="mt-1 font-black text-gray-900 text-4xl">
                                        {totalRecords}
                                    </p>
                                    {backup && (
                                        <p className="text-xs text-blue-600 mt-2 flex items-center justify-center gap-1 font-medium">
                                            <CheckCircle2 size={12} /> Backup habilitado
                                        </p>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Esta acción reiniciará los movimientos a su estado original (pendientes), perdiendo las clasificaciones actuales y detalles divididos.
                                </p>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setConfirmingMassive(false)}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold transition-all text-sm uppercase tracking-wide"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDesvincularMasivo}
                                    className="flex-[2] px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-black shadow-lg shadow-amber-200 transition-all text-sm uppercase tracking-wide flex justify-center items-center gap-2"
                                >
                                    {loading ? 'Procesando...' : 'Sí, Desvincular'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

// Subcomponent for Stats
const StatCard = ({ label, value, icon: Icon, color, isCurrency = false }: any) => {
    // Color maps
    const colors: any = {
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        rose: 'bg-rose-50 text-rose-700 border-rose-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200'
    };

    return (
        <div className={`p-4 rounded-xl border flex flex-col items-start shadow-sm transition-all hover:shadow-md ${colors[color] || colors.slate}`}>
            <div className="flex items-center gap-2 mb-2 opacity-80">
                <Icon size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-2xl font-black">
                {isCurrency
                    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
                    : value}
            </span>
        </div>
    )
}
