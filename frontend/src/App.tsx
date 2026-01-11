import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from './components/Sidebar'
import { DashboardPage } from './pages/DashboardPage'
import { CuentasPage } from './pages/CuentasPage'
import { MonedasPage } from './pages/MonedasPage'
import { TiposMovimientoPage } from './pages/TiposMovimientoPage'
import { TercerosPage } from './pages/TercerosPage'
import { TerceroDescripcionesPage } from './pages/TerceroDescripcionesPage'
import { GruposPage } from './pages/GruposPage'
import { ConceptosPage } from './pages/ConceptosPage'
import { MovimientosPage } from './pages/MovimientosPage'
import { MovimientoFormPage } from './pages/MovimientoFormPage'
import { ReporteClasificacionesPage } from './pages/ReporteClasificacionesPage'
import { ClasificarMovimientosPage } from './pages/ClasificarMovimientosPage'
import { ReporteIngresosGastosMesPage } from './pages/ReporteIngresosGastosMesPage'
import { UploadMovimientosPage } from './pages/UploadMovimientosPage'
import { ReglasPage } from './pages/ReglasPage'
import { DescargarMovimientosPage } from './pages/DescargarMovimientosPage'
import { SugerenciasReclasificacionPage } from './pages/SugerenciasReclasificacionPage'
import { ReporteEgresosTerceroPage } from './pages/ReporteEgresosTerceroPage'
import { ReporteEgresosGrupoPage } from './pages/ReporteEgresosGrupoPage'
import { ConfigFiltrosGruposPage } from './pages/ConfigFiltrosGruposPage'


function App() {
    return (
        <Router>
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <Toaster position="top-right" />
                <main className="flex-1 overflow-y-auto bg-gray-50">
                    <div className="p-8">
                        <Routes>
                            <Route path="/" element={<DashboardPage />} />
                            <Route path="/maestros/monedas" element={<MonedasPage />} />
                            <Route path="/maestros/cuentas" element={<CuentasPage />} />
                            <Route path="/maestros/tipos-movimiento" element={<TiposMovimientoPage />} />
                            <Route path="/maestros/terceros" element={<TercerosPage />} />
                            <Route path="/maestros/terceros-descripciones" element={<TerceroDescripcionesPage />} />
                            <Route path="/maestros/grupos" element={<GruposPage />} />
                            <Route path="/maestros/conceptos" element={<ConceptosPage />} />
                            <Route path="/maestros/config-filtros" element={<ConfigFiltrosGruposPage />} />
                            <Route path="/maestros/reglas" element={<ReglasPage />} />
                            <Route path="/movimientos" element={<MovimientosPage />} />
                            <Route path="/movimientos/cargar" element={<UploadMovimientosPage />} />
                            <Route path="/movimientos/nuevo" element={<MovimientoFormPage />} />
                            <Route path="/movimientos/reporte" element={<ReporteClasificacionesPage />} />
                            <Route path="/movimientos/sugerencias" element={<SugerenciasReclasificacionPage />} />
                            <Route path="/reportes/egresos-tercero" element={<ReporteEgresosTerceroPage />} />
                            <Route path="/reportes/egresos-grupo" element={<ReporteEgresosGrupoPage />} />
                            <Route path="/reportes/ingresos-gastos" element={<ReporteIngresosGastosMesPage />} />
                            <Route path="/reportes/descargar" element={<DescargarMovimientosPage />} />
                            <Route path="/movimientos/clasificar" element={<ClasificarMovimientosPage />} />
                            <Route path="/movimientos/editar/:id" element={<MovimientoFormPage />} />
                            <Route path="/mvtos/*" element={
                                <div className="p-8">
                                    <h1 className="text-2xl font-bold text-gray-400">Próximamente</h1>
                                    <p className="text-gray-500">Módulo de movimientos en construcción.</p>
                                </div>
                            } />
                        </Routes>
                    </div>
                </main>
            </div>
        </Router>
    )
}

export default App
