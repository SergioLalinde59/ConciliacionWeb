import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Save, RefreshCw, ArrowLeft, FileText } from 'lucide-react';

import { FiltrosReporte } from '../components/organisms/FiltrosReporte';
import { useCatalogo } from '../hooks/useCatalogo';
import { conciliacionService } from '../services/conciliacionService';
import { getMesActual, getMonthsBetween } from '../utils/dateUtils';
import type { Conciliacion } from '../types/Conciliacion';
import type { Cuenta } from '../types';
import { CurrencyDisplay } from '../components/atoms/CurrencyDisplay';
import { DataTable, type Column } from '../components/molecules/DataTable';

import { ConciliacionMovimientosTab } from '../components/organisms/ConciliacionMovimientosTab';

export const ConciliacionPage = () => {
    // State for filters
    const [desde, setDesde] = useState(getMesActual().inicio);
    const [hasta, setHasta] = useState(getMesActual().fin);
    const [cuentaId, setCuentaId] = useState('');

    // State for Detail View
    const [selectedConciliacion, setSelectedConciliacion] = useState<{ cuentaId: number, year: number, month: number } | null>(null);

    const { cuentas } = useCatalogo();

    // Filter accounts to display
    const reconcilableCuentas = useMemo(() => {
        return cuentas.filter((c: Cuenta) => c.permite_conciliar);
    }, [cuentas]);

    const visibleCuentas = useMemo(() => {
        if (cuentaId) {
            return reconcilableCuentas.filter((c: Cuenta) => c.id === Number(cuentaId));
        }
        return reconcilableCuentas;
    }, [reconcilableCuentas, cuentaId]);

    // Derived months based on range
    const selectedMonths = useMemo(() => {
        return getMonthsBetween(desde, hasta).reverse();
    }, [desde, hasta]);

    // Key format: "cuentaId-year-month"
    const [conciliaciones, setConciliaciones] = useState<Record<string, Conciliacion>>({});
    const [loading, setLoading] = useState(false);

    // Reset selection when filters change
    useEffect(() => {
        setSelectedConciliacion(null);
    }, [desde, hasta, cuentaId]);

    // Fetch data when accounts or date changes
    useEffect(() => {
        if (visibleCuentas.length === 0 || selectedMonths.length === 0) return;

        const fetchAll = async () => {
            setLoading(true);
            const results: Record<string, Conciliacion> = {};

            // Fetch concurrently for all visible accounts AND months
            const promises = [];
            for (const cta of visibleCuentas) {
                for (const { year, month } of selectedMonths) {
                    promises.push(
                        conciliacionService.getByPeriod(cta.id, year, month)
                            .then(data => {
                                results[`${cta.id}-${year}-${month}`] = data;
                            })
                            .catch((e: Error) => console.error(`Error fetching conciliacion for ${cta.id}-${year}-${month}`, e))
                    );
                }
            }
            await Promise.all(promises);

            setConciliaciones(results);
            setLoading(false);
        };

        fetchAll();
    }, [visibleCuentas, selectedMonths]);

    const getConcKey = (cuentaId: number, year: number, month: number) => `${cuentaId}-${year}-${month}`;


    const closeMutation = useMutation({
        mutationFn: ({ cuentaId, year, month }: { cuentaId: number, year: number, month: number }) =>
            conciliacionService.cerrarConciliacion(cuentaId, year, month),
        onSuccess: (data: Conciliacion) => {
            const key = getConcKey(data.cuenta_id, data.year, data.month);
            setConciliaciones((prev: Record<string, Conciliacion>) => ({
                ...prev,
                [key]: data
            }));
        },
        onError: (error: any) => {
            alert("Error al cerrar: " + (error.message || "Error desconocido"));
        }
    });


    const handleRecalculate = async (cuentaId: number, year: number, month: number) => {
        try {
            const updated = await conciliacionService.recalculate(cuentaId, year, month);
            const key = getConcKey(cuentaId, year, month);
            setConciliaciones((prev: Record<string, Conciliacion>) => ({
                ...prev,
                [key]: updated
            }));
        } catch (e: any) {
            console.error("Error recalculating", e);
        }
    };

    const handleLimpiar = () => {
        const current = getMesActual();
        setDesde(current.inicio);
        setHasta(current.fin);
        setCuentaId('');
        setSelectedConciliacion(null);
    };

    // Helper to get month name
    const getMonthName = (month: number) => {
        return new Date(2000, month - 1, 1).toLocaleString('es-CO', { month: 'long' });
    };

    // --- Data Preparation for DataTable ---
    interface ConciliacionRow {
        id: string; // unique key
        cuenta: Cuenta;
        nombre_cuenta: string; // Needed for sorting
        year: number;
        month: number;
        // Flattened fields for Sorting
        sistema_entradas: number;
        sistema_salidas: number;
        extracto_saldo_anterior: number;
        extracto_entradas: number;
        extracto_salidas: number;
        extracto_saldo_final: number;
        dif_in: number;
        dif_out: number;
        diferencia: number;
        // Context
        conciliacion: Conciliacion | undefined;
    }

    const tableData: ConciliacionRow[] = useMemo(() => {
        const rows: ConciliacionRow[] = [];
        if (!loading) {
            visibleCuentas.forEach((cta) => {
                selectedMonths.forEach(({ year, month }) => {
                    const key = getConcKey(cta.id, year, month);
                    const conc = conciliaciones[key];
                    rows.push({
                        id: key,
                        cuenta: cta,
                        nombre_cuenta: cta.nombre,
                        year,
                        month,
                        // Flattened Values (default to 0 to ensure sorting works on numbers)
                        sistema_entradas: conc?.sistema_entradas || 0,
                        sistema_salidas: conc?.sistema_salidas || 0,
                        extracto_saldo_anterior: conc?.extracto_saldo_anterior || 0,
                        extracto_entradas: conc?.extracto_entradas || 0,
                        extracto_salidas: conc?.extracto_salidas || 0,
                        extracto_saldo_final: conc?.extracto_saldo_final || 0,
                        dif_in: (conc?.extracto_entradas || 0) - (conc?.sistema_entradas || 0),
                        dif_out: (conc?.extracto_salidas || 0) - (conc?.sistema_salidas || 0),
                        diferencia: ((conc?.extracto_entradas || 0) - (conc?.sistema_entradas || 0)) - ((conc?.extracto_salidas || 0) - (conc?.sistema_salidas || 0)),
                        conciliacion: conc
                    });
                });
            });
        }
        return rows;
    }, [loading, visibleCuentas, selectedMonths, conciliaciones]);

    const columns: Column<ConciliacionRow>[] = [
        {
            key: 'cuenta',
            header: 'Cuenta / Periodo',
            accessor: (row) => {
                const monthName = getMonthName(row.month);
                const colorMap = {
                    'VERDE': 'bg-green-500',
                    'AMARILLO': 'bg-yellow-500',
                    'ROJO': 'bg-red-500'
                };
                const statusColor = row.conciliacion?.semaforo_estado ? colorMap[row.conciliacion.semaforo_estado as keyof typeof colorMap] : 'bg-gray-300';

                return (
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${statusColor} shadow-sm`} title={row.conciliacion?.estado} />
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{row.cuenta.nombre}</span>
                            <span className="text-xs text-gray-400 font-normal capitalize">{monthName} {row.year}</span>
                        </div>
                    </div>
                );
            },
            width: 'w-56',
            sortable: true,
            sortKey: 'nombre_cuenta'
        },
        // Extracto Columns (Ahora primero)
        {
            key: 'extracto_saldo_anterior',
            header: 'Saldo Ant',
            accessor: (row) => <CurrencyDisplay value={row.extracto_saldo_anterior} decimals={0} />,
            align: 'right',
            headerClassName: 'bg-emerald-50 text-emerald-800 border-l border-b-2 border-emerald-200',
            cellClassName: 'border-l border-gray-100 text-gray-600 text-xs',
            sortable: true
        },
        {
            key: 'extracto_entradas',
            header: 'Entradas',
            accessor: (row) => <CurrencyDisplay value={row.extracto_entradas} />,
            align: 'right',
            headerClassName: 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-200',
            cellClassName: 'text-gray-600 text-xs',
            sortable: true
        },
        {
            key: 'extracto_salidas',
            header: 'Salidas',
            accessor: (row) => <CurrencyDisplay value={row.extracto_salidas} />,
            align: 'right',
            headerClassName: 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-200',
            cellClassName: 'text-gray-600 text-xs',
            sortable: true
        },
        {
            key: 'extracto_saldo_final',
            header: 'Saldo Final',
            accessor: (row) => <CurrencyDisplay value={row.extracto_saldo_final} className="font-bold" />,
            align: 'right',
            headerClassName: 'bg-emerald-50 text-emerald-800 font-bold border-b-2 border-emerald-200',
            cellClassName: 'bg-emerald-50/30 text-xs',
            sortable: true
        },
        // Sistema Columns (Ahora segundo)
        {
            key: 'sistema_entradas',
            header: 'Entradas',
            accessor: (row) => <CurrencyDisplay value={row.sistema_entradas} />,
            align: 'right',
            headerClassName: 'bg-blue-50 text-blue-800 border-l border-b-2 border-blue-200',
            cellClassName: 'border-l border-gray-100 text-gray-600 text-xs',
            sortable: true
        },
        {
            key: 'sistema_salidas',
            header: 'Salidas',
            accessor: (row) => <CurrencyDisplay value={row.sistema_salidas} />,
            align: 'right',
            headerClassName: 'bg-blue-50 text-blue-800 border-b-2 border-blue-200',
            cellClassName: 'text-gray-600 text-xs',
            sortable: true
        },
        // Diferencias
        {
            key: 'dif_in',
            header: 'Dif In',
            accessor: (row) => <CurrencyDisplay value={row.dif_in} colorize={true} />,
            align: 'right',
            headerClassName: 'bg-gray-50 text-gray-700 border-l border-b-2 border-gray-200 text-xs',
            cellClassName: 'border-l border-gray-50 text-xs',
            sortable: true
        },
        {
            key: 'dif_out',
            header: 'Dif Out',
            accessor: (row) => <CurrencyDisplay value={row.dif_out} colorize={true} />,
            align: 'right',
            headerClassName: 'bg-gray-50 text-gray-700 border-b-2 border-gray-200 text-xs',
            cellClassName: 'text-xs',
            sortable: true
        },
        {
            key: 'diferencia',
            header: 'DIF',
            accessor: (row) => <CurrencyDisplay value={row.diferencia} className="font-bold" colorize={true} />,
            align: 'right',
            headerClassName: 'bg-gray-100 text-gray-900 font-bold border-b-2 border-gray-300',
            cellClassName: 'bg-gray-50/50 text-xs',
            sortable: true
        },
        // Actions
        {
            key: 'actions',
            header: 'Acciones',
            accessor: (row) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setSelectedConciliacion({ cuentaId: row.cuenta.id, year: row.year, month: row.month })}
                        className="p-1.5 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                        title="Ver Detalle de Movimientos"
                    >
                        <FileText size={18} />
                    </button>

                    {row.conciliacion?.semaforo_estado === 'AMARILLO' && (
                        <button
                            onClick={() => closeMutation.mutate({ cuentaId: row.cuenta.id, year: row.year, month: row.month })}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg transition-colors border border-transparent hover:border-green-100"
                            title="Aprobar y Cerrar Conciliación"
                        >
                            <Save size={18} />
                        </button>
                    )}

                    {row.conciliacion?.estado !== 'CONCILIADO' && (
                        <button
                            onClick={() => handleRecalculate(row.cuenta.id, row.year, row.month)}
                            className="p-1.5 hover:bg-orange-50 text-orange-500 rounded-lg transition-colors border border-transparent hover:border-orange-100"
                            title="Recalcular Sistema"
                        >
                            <RefreshCw size={18} />
                        </button>
                    )}
                </div>
            ),
            align: 'right',
            width: 'w-32'
        }
    ];

    const headerGroups = [
        { title: '', colSpan: 1 }, // Cuenta
        { title: 'EXTRACTO', colSpan: 4, className: 'text-center bg-emerald-50 text-emerald-800 border-l border-emerald-200 text-[10px] font-bold tracking-wider' },
        { title: 'SISTEMA', colSpan: 2, className: 'text-center bg-blue-50 text-blue-800 border-l border-blue-200 text-[10px] font-bold tracking-wider' },
        { title: 'DIFERENCIAS', colSpan: 3, className: 'text-center bg-gray-100 text-gray-800 border-l border-gray-300 text-[10px] font-bold tracking-wider' },
        { title: '', colSpan: 1 }, // Acciones
    ];


    // --- RENDER ---

    // If a specific period is selected, show the detail view
    if (selectedConciliacion) {
        const { cuentaId, year, month } = selectedConciliacion;
        const cuenta = cuentas.find(c => c.id === cuentaId);
        const monthName = getMonthName(month);

        return (
            <div className="flex flex-col gap-6 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedConciliacion(null)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Detalle de Conciliación</h1>
                        <p className="text-gray-500 text-sm">
                            {cuenta?.nombre} - <span className="capitalize">{monthName} {year}</span>
                        </p>
                    </div>
                </div>

                <ConciliacionMovimientosTab
                    cuentaId={cuentaId}
                    year={year}
                    month={month}
                    onConciliacionUpdate={(updated) => {
                        const key = getConcKey(updated.cuenta_id, updated.year, updated.month);
                        setConciliaciones(prev => ({
                            ...prev,
                            [key]: updated
                        }));
                    }}
                />
            </div>
        );
    }

    // Default View: Summary Table
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Conciliación Mensual</h1>
                    <p className="text-gray-500 text-sm mt-1">Gestión y cuadre de saldos bancarios</p>
                </div>
            </div>

            {/* Reusable Filters */}
            <FiltrosReporte
                desde={desde}
                hasta={hasta}
                onDesdeChange={setDesde}
                onHastaChange={setHasta}
                cuentaId={cuentaId}
                onCuentaChange={setCuentaId}
                onLimpiar={handleLimpiar}
                // Disable unused filters
                showClasificacionFilters={false}
                showIngresosEgresos={false}
            />

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <DataTable
                    data={tableData}
                    columns={columns}
                    headerGroups={headerGroups}
                    loading={loading}
                    loadingMessage="Cargando saldos..."
                    emptyMessage={visibleCuentas.length === 0 ? "No hay cuentas seleccionadas." : "No hay datos para el periodo seleccionado."}
                    getRowKey={(row) => row.id}
                    showActions={false}
                    className="border-none"
                    rounded={false}
                />
            </div>
        </div>
    );
};
