import { useState, useEffect } from 'react'
import type { Movimiento, ClasificacionManual } from '../types'
import { MovementsTable } from '../components/MovementsTable'
import { ClassificationModal } from '../components/ClassificationModal'
import { apiService } from '../services/api'
import { useCatalogo } from '../hooks/useCatalogo'
import toast from 'react-hot-toast'

export const DashboardPage = () => {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [loading, setLoading] = useState(true)

    // Catálogos desde Hook centralizado
    const { terceros, grupos, conceptos } = useCatalogo()

    // Estado del Modal
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<Movimiento | null>(null)

    const cargarDatos = () => {
        setLoading(true)
        apiService.movimientos.obtenerPendientes()
            .then(data => {
                setMovimientos(data)
                setLoading(false)
            })
            .catch(err => {
                console.error("Error cargando movimientos:", err)
                setLoading(false)
            })
    }

    useEffect(() => {
        cargarDatos()
    }, [])

    const handleAutoClassify = () => {
        setLoading(true)
        apiService.movimientos.autoClasificar()
            .then(data => {
                const mensaje = data.resumen || `Clasificados: ${data.clasificados}`
                toast.success(`Proceso completado. ${mensaje}`)
                cargarDatos()
            })
            .catch(err => {
                console.error("Error:", err)
                toast.error("Error al clasificar los movimientos: " + err.message)
                setLoading(false)
            })
    }

    const abrirModal = (mov: Movimiento) => {
        setItemEditando(mov)
        setModalOpen(true)
    }

    const guardarClasificacion = (datos: ClasificacionManual) => {
        if (!itemEditando) return

        apiService.movimientos.clasificar(itemEditando.id, datos)
            .then(() => {
                toast.success('Movimiento clasificado correctamente')
                setModalOpen(false)
                setItemEditando(null)
                cargarDatos()
            })
            .catch(err => {
                toast.error("Error al guardar la clasificación: " + err.message)
            })
    }

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Gastos SLB - Panel Web</h1>
                <p className="text-gray-500">Gestión Inteligente de Movimientos (Versión Hexagonal)</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Movimientos Pendientes ({movimientos.length})
                    </h2>
                    <button
                        onClick={handleAutoClassify}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        Analizar Automáticamente
                    </button>
                </div>

                <MovementsTable
                    movimientos={movimientos}
                    loading={loading}
                    onClasificar={abrirModal}
                />
            </div>

            <ClassificationModal
                isOpen={modalOpen}
                movimiento={itemEditando}
                terceros={terceros}
                grupos={grupos}
                conceptos={conceptos}
                onClose={() => setModalOpen(false)}
                onSave={guardarClasificacion}
            />
        </div>
    )
}
