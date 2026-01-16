import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/templates/MainLayout'
import { DashboardPage } from './pages/DashboardPage'
import { CuentasPage } from './pages/CuentasPage'
import { MonedasPage } from './pages/MonedasPage'
import { TiposMovimientoPage } from './pages/TiposMovimientoPage'
import { TercerosPage } from './pages/TercerosPage'
import { TerceroDescripcionesPage } from './pages/TerceroDescripcionesPage'
import { CentrosCostosPage } from './pages/CentrosCostosPage'
import { ConceptosPage } from './pages/ConceptosPage'
import { MovimientosPage } from './pages/MovimientosPage'
import { MovimientoFormPage } from './pages/MovimientoFormPage'
import { ReporteClasificacionesPage } from './pages/ReporteClasificacionesPage'
import { ClasificarMovimientosPage } from './pages/ClasificarMovimientosPage'
import { ReporteIngresosGastosMesPage } from './pages/ReporteIngresosGastosMesPage'
import { UploadMovimientosPage } from './pages/UploadMovimientosPage'
import { UploadExtractoPage } from './pages/UploadExtractoPage'
import { ReglasPage } from './pages/ReglasPage'
import { DescargarMovimientosPage } from './pages/DescargarMovimientosPage'
import { SugerenciasReclasificacionPage } from './pages/SugerenciasReclasificacionPage'
import { ReporteEgresosTerceroPage } from './pages/ReporteEgresosTerceroPage'
import { ReporteEgresosCentroCostoPage } from './pages/ReporteEgresosCentroCostoPage'
import { ConfigFiltrosCentrosCostosPage } from './pages/ConfigFiltrosCentrosCostosPage'
import { ConciliacionPage } from './pages/ConciliacionPage'


function App() {
    return (
        <Router>
            <MainLayout>
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/maestros/monedas" element={<MonedasPage />} />
                    <Route path="/maestros/cuentas" element={<CuentasPage />} />
                    <Route path="/maestros/tipos-movimiento" element={<TiposMovimientoPage />} />
                    <Route path="/maestros/terceros" element={<TercerosPage />} />
                    <Route path="/maestros/terceros-descripciones" element={<TerceroDescripcionesPage />} />
                    <Route path="/maestros/centros-costos" element={<CentrosCostosPage />} />
                    <Route path="/maestros/conceptos" element={<ConceptosPage />} />
                    <Route path="/maestros/config-filtros" element={<ConfigFiltrosCentrosCostosPage />} />
                    <Route path="/maestros/reglas" element={<ReglasPage />} />
                    <Route path="/movimientos" element={<MovimientosPage />} />
                    <Route path="/movimientos/cargar" element={<UploadMovimientosPage />} />
                    <Route path="/conciliacion/cargar-extracto" element={<UploadExtractoPage />} />
                    <Route path="/movimientos/nuevo" element={<MovimientoFormPage />} />
                    <Route path="/movimientos/reporte" element={<ReporteClasificacionesPage />} />
                    <Route path="/movimientos/sugerencias" element={<SugerenciasReclasificacionPage />} />
                    <Route path="/reportes/egresos-tercero" element={<ReporteEgresosTerceroPage />} />
                    <Route path="/reportes/egresos-centro-costo" element={<ReporteEgresosCentroCostoPage />} />
                    <Route path="/reportes/ingresos-gastos" element={<ReporteIngresosGastosMesPage />} />
                    <Route path="/reportes/descargar" element={<DescargarMovimientosPage />} />
                    <Route path="/movimientos/clasificar" element={<ClasificarMovimientosPage />} />
                    <Route path="/movimientos/editar/:id" element={<MovimientoFormPage />} />
                    <Route path="/conciliacion" element={<ConciliacionPage />} />
                    <Route path="/mvtos/*" element={
                        <div className="p-8">
                            <h1 className="text-2xl font-bold text-gray-400">Próximamente</h1>
                            <p className="text-gray-500">Módulo de movimientos en construcción.</p>
                        </div>
                    } />
                </Routes>
            </MainLayout>
        </Router>
    )
}

export default App
