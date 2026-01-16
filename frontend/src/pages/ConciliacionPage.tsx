import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Save, RefreshCw } from 'lucide-react';


import { FiltrosReporte } from '../components/organisms/FiltrosReporte';
import { conciliacionService } from '../services/conciliacionService';
import { cuentasService } from '../services/api';
import { getMesActual, getMonthsBetween } from '../utils/dateUtils';
import type { Conciliacion, ConciliacionUpdate } from '../types/Conciliacion';
import type { Cuenta } from '../types';
import { CurrencyDisplay } from '../components/atoms/CurrencyDisplay';
import { EditableCurrencyCell } from '../components/molecules/EditableCurrencyCell';

export const ConciliacionPage = () => {
    // State for filters
    const [desde, setDesde] = useState(getMesActual().inicio);
    const [hasta, setHasta] = useState(getMesActual().fin);
    const [cuentaId, setCuentaId] = useState('');



    // Load available accounts for the filter
    const { data: cuentasResult } = useQuery({
        queryKey: ['cuentas'],
        queryFn: cuentasService.listar
    });
    const cuentas = cuentasResult || [];

    // Filter accounts to display
    // Filter accounts to display
    const reconcilableCuentas = useMemo(() => {
        if (!cuentas) return [];
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
        // Import dynamically if not available in closure? No, it's imported at top.
        // Wait, I need to import getMonthsBetween first.
        // Assuming I will add the import in a separate tool call or I'll just rely on the user to fix imports?
        // Better to include the import update in a separate step or try to do it all if possible.
        // I'll assume getMonthsBetween is available or I will add the import in a separate step.
        // Actually, let's look at the imports. I'll need to update imports too.
        // For this step I will focus on the logic inside the component.
        return getMonthsBetween(desde, hasta).reverse();
    }, [desde, hasta]);

    // Key format: "cuentaId-year-month"
    const [conciliaciones, setConciliaciones] = useState<Record<string, Conciliacion>>({});
    const [loading, setLoading] = useState(false);

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
                            .catch(e => console.error(`Error fetching conciliacion for ${cta.id}-${year}-${month}`, e))
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

    const handleUpdate = (cuentaId: number, year: number, month: number, field: keyof Conciliacion, value: string) => {
        const numValue = parseFloat(value) || 0;
        const key = getConcKey(cuentaId, year, month);
        setConciliaciones(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: numValue
            }
        }));
    };

    const saveMutation = useMutation({
        mutationFn: conciliacionService.save,
        onSuccess: (data) => {
            const key = getConcKey(data.cuenta_id, data.year, data.month);
            setConciliaciones(prev => ({
                ...prev,
                [key]: data
            }));
        }
    });

    const handleSave = (cuentaId: number, year: number, month: number) => {
        const key = getConcKey(cuentaId, year, month);
        const current = conciliaciones[key];
        if (!current) return;

        const updateData: ConciliacionUpdate = {
            cuenta_id: current.cuenta_id,
            year: current.year,
            month: current.month,
            fecha_corte: current.fecha_corte,
            extracto_saldo_anterior: current.extracto_saldo_anterior,
            extracto_entradas: current.extracto_entradas,
            extracto_salidas: current.extracto_salidas,
            extracto_saldo_final: current.extracto_saldo_final,
            datos_extra: current.datos_extra
        };
        saveMutation.mutate(updateData);
    };

    const handleRecalculate = async (cuentaId: number, year: number, month: number) => {
        try {
            const updated = await conciliacionService.recalculate(cuentaId, year, month);
            const key = getConcKey(cuentaId, year, month);
            setConciliaciones(prev => ({
                ...prev,
                [key]: updated
            }));
        } catch (e) {
            console.error("Error recalculating", e);
        }
    };

    const handleLimpiar = () => {
        const current = getMesActual();
        setDesde(current.inicio);
        setHasta(current.fin);
        setCuentaId('');
    };

    // Helper to get month name
    const getMonthName = (month: number) => {
        return new Date(2000, month - 1, 1).toLocaleString('es-CO', { month: 'long' });
    };

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
                cuentas={reconcilableCuentas}
                onLimpiar={handleLimpiar}
                // Disable unused filters
                showClasificacionFilters={false}
                showIngresosEgresos={false}
                showSoloPendientes={false}
            />

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-xs border-b border-gray-200">
                            <tr>
                                <th className="p-4 bg-gray-50">Cuenta / Periodo</th>
                                <th className="p-4 text-center bg-blue-50/50 border-l border-gray-200 text-blue-800" colSpan={3}>Sistema (Calculado)</th>
                                <th className="p-4 text-center bg-emerald-50/50 border-l border-gray-200 text-emerald-800" colSpan={4}>Extracto (Manual)</th>
                                <th className="p-4 border-l border-gray-200 text-center">Diferencia</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                            <tr className="text-[10px] tracking-wider text-gray-400">
                                <th className="p-2 pb-3"></th>
                                {/* Sistema */}
                                <th className="p-2 pb-3 border-l border-gray-200 text-right">Entradas</th>
                                <th className="p-2 pb-3 text-right">Salidas</th>
                                <th className="p-2 pb-3 text-right font-bold text-blue-600">Saldo Final</th>
                                {/* Extracto */}
                                <th className="p-2 pb-3 border-l border-gray-200 text-right">Saldo Ant.</th>
                                <th className="p-2 pb-3 text-right">Entradas</th>
                                <th className="p-2 pb-3 text-right">Salidas</th>
                                <th className="p-2 pb-3 text-right font-bold text-emerald-600">Saldo Final</th>
                                {/* Diferencia */}
                                <th className="p-2 pb-3 border-l border-gray-200"></th>
                                <th className="p-2 pb-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {!loading && visibleCuentas.map((cta: Cuenta) => {
                                return selectedMonths.map(({ year, month }) => {
                                    const key = getConcKey(cta.id, year, month);
                                    const conc = conciliaciones[key];

                                    // If loading specific row or not found yet
                                    if (!conc) return null;

                                    // Diferencia: Extracto - Sistema
                                    const diff = (conc.extracto_saldo_final || 0) - (conc.sistema_saldo_final || 0);
                                    const monthName = getMonthName(month);

                                    return (
                                        <tr key={key} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-medium text-gray-800">
                                                <div className="flex flex-col">
                                                    <span>{cta.nombre}</span>
                                                    <span className="text-xs text-gray-400 font-normal capitalize">{monthName} {year}</span>
                                                </div>
                                            </td>

                                            {/* Sistema ReadOnly */}
                                            <td className="p-2 border-l border-gray-100 text-right text-gray-600">
                                                <CurrencyDisplay value={conc.sistema_entradas} />
                                            </td>
                                            <td className="p-2 text-right text-gray-600">
                                                <CurrencyDisplay value={conc.sistema_salidas} />
                                            </td>
                                            <td className="p-2 font-bold text-right">
                                                <CurrencyDisplay value={conc.sistema_saldo_final} className="font-bold" />
                                            </td>

                                            {/* Extracto Editable */}
                                            <td className="p-2 border-l border-gray-100 text-right text-gray-600">
                                                <EditableCurrencyCell
                                                    value={conc.extracto_saldo_anterior}
                                                    onChange={(val) => handleUpdate(cta.id, year, month, 'extracto_saldo_anterior', val)}
                                                />
                                            </td>
                                            <td className="p-2 text-right text-gray-600">
                                                <EditableCurrencyCell
                                                    value={conc.extracto_entradas}
                                                    onChange={(val) => handleUpdate(cta.id, year, month, 'extracto_entradas', val)}
                                                />
                                            </td>
                                            <td className="p-2 text-right text-gray-600">
                                                <EditableCurrencyCell
                                                    value={conc.extracto_salidas}
                                                    onChange={(val) => handleUpdate(cta.id, year, month, 'extracto_salidas', val)}
                                                />
                                            </td>
                                            <td className="p-2 text-right">
                                                <EditableCurrencyCell
                                                    value={conc.extracto_saldo_final}
                                                    onChange={(val) => handleUpdate(cta.id, year, month, 'extracto_saldo_final', val)}
                                                    className="font-bold border-b border-emerald-300"
                                                />
                                            </td>

                                            {/* Diferencia */}
                                            <td className="p-4 font-bold border-l border-gray-100 text-right">
                                                <CurrencyDisplay value={diff} className="font-bold" />
                                            </td>

                                            <td className="p-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSave(cta.id, year, month)}
                                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                        title="Guardar Cambios"
                                                    >
                                                        <Save size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRecalculate(cta.id, year, month)}
                                                        className="p-2 hover:bg-orange-50 text-orange-500 rounded-lg transition-colors border border-transparent hover:border-orange-100"
                                                        title="Recalcular Sistema"
                                                    >
                                                        <RefreshCw size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>
                    </table>
                    {loading && (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                            <p>Cargando saldos...</p>
                        </div>
                    )}
                    {!loading && visibleCuentas.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            No hay cuentas seleccionadas.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
