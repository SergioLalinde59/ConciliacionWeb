import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Wallet,
    Coins,
    ArrowRightLeft,
    Users,
    Layers,
    Tags,
    Receipt,
    BarChart3,
    ListTodo,
    UploadCloud,
    Zap,
    ChevronDown,
    ChevronRight,
    Download,
    TrendingUp,
    Sparkles,
    PieChart,
    Filter
} from 'lucide-react';

export const Sidebar = () => {
    const location = useLocation();
    const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({
        maestros: true,
        movimientos: true,
        reportes: true
    });

    const toggleSection = (section: string) => {
        setExpanded(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const menuMaestros = [
        { name: 'Cuentas', path: '/maestros/cuentas', icon: Wallet },
        { name: 'Monedas', path: '/maestros/monedas', icon: Coins },
        { name: 'Tipo de Movimientos', path: '/maestros/tipos-movimiento', icon: ArrowRightLeft },
        { name: 'Terceros', path: '/maestros/terceros', icon: Users },
        { name: 'Alias Terceros', path: '/maestros/terceros-descripciones', icon: ListTodo },
        { name: 'Grupos', path: '/maestros/grupos', icon: Layers },
        { name: 'Conceptos', path: '/maestros/conceptos', icon: Tags },
        { name: 'Config. Filtros', path: '/maestros/config-filtros', icon: Filter },
        { name: 'Reglas Auto', path: '/maestros/reglas', icon: Zap },
    ];

    const menuMovimientos = [
        { name: 'Cargar Movimiento', path: '/movimientos/cargar', icon: UploadCloud },
        { name: 'Por Clasificar', path: '/movimientos/clasificar', icon: ListTodo },
        { name: 'Sugerencias Reclasif.', path: '/movimientos/sugerencias', icon: Sparkles },
        { name: 'Movimientos', path: '/movimientos', icon: Receipt },
    ];

    const menuReportes = [
        { name: 'Reporte Clasificación', path: '/movimientos/reporte', icon: BarChart3 },
        { name: 'Egresos por Tercero', path: '/reportes/egresos-tercero', icon: PieChart },
        { name: 'Egresos por Grupo', path: '/reportes/egresos-grupo', icon: Layers },
        { name: 'Ingresos y Gastos', path: '/reportes/ingresos-gastos', icon: TrendingUp },
        { name: 'Descargar Movimientos', path: '/reportes/descargar', icon: Download },
    ];

    const isActive = (path: string) => location.pathname === path;

    const renderMenuSection = (title: string, items: typeof menuMaestros, sectionKey: string) => (
        <div className="px-4 mt-4">
            <button
                onClick={() => toggleSection(sectionKey)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 hover:text-slate-300 transition-colors"
            >
                <span>{title}</span>
                {expanded[sectionKey] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${expanded[sectionKey] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isActive(item.path)
                                ? 'bg-slate-800 text-blue-400 border-r-2 border-blue-400'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <Icon size={18} />
                            <span className="font-medium text-sm">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );

    return (
        <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl no-print">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-blue-400 text-2xl">⚡</span> Movimientos Bancarios
                </h2>
                <p className="text-slate-500 text-xs mt-1">Gestión Hexagonal</p>
            </div>

            <nav className="flex-1 py-6 overflow-y-auto">
                <div className="px-4 mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Principal</p>
                    <Link
                        to="/"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${location.pathname === '/'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <LayoutDashboard size={20} />
                        <span className="font-medium">Dashboard</span>
                    </Link>
                </div>

                {renderMenuSection('Maestros', menuMaestros, 'maestros')}
                {renderMenuSection('Movimientos', menuMovimientos, 'movimientos')}
                {renderMenuSection('Reportes', menuReportes, 'reportes')}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold">U</div>
                    <div>
                        <p className="text-white font-medium">Usuario</p>
                        <p className="text-xs">Admin</p>
                    </div>
                </div>
            </div>
        </aside >
    );
};
