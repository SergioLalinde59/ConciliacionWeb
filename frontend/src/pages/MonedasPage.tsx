import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import type { Moneda } from '../types'
import { MonedasTable } from '../components/MonedasTable'
import { MonedaModal } from '../components/MonedaModal'
import { CsvExportButton } from '../components/CsvExportButton'
import { API_BASE_URL } from '../config'

export const MonedasPage = () => {
    const [monedas, setMonedas] = useState<Moneda[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<Moneda | null>(null)

    const cargarMonedas = () => {
        setLoading(true)
        fetch(`${API_BASE_URL}/api/monedas`)
            .then(res => res.json())
            .then(data => {
                setMonedas(data)
                setLoading(false)
            })
            .catch(err => {
                console.error("Error cargando monedas:", err)
                setLoading(false)
            })
    }

    useEffect(() => {
        cargarMonedas()
    }, [])

    const handleCreate = () => {
        setItemEditando(null)
        setModalOpen(true)
    }

    const handleEdit = (moneda: Moneda) => {
        setItemEditando(moneda)
        setModalOpen(true)
    }

    const handleDelete = (id: number) => {
        fetch(`${API_BASE_URL}/api/monedas/${id}`, { method: 'DELETE' })
            .then(async res => {
                if (res.ok) {
                    toast.success('Moneda eliminada')
                    cargarMonedas()
                } else {
                    const error = await res.json()
                    toast.error("Error al eliminar: " + (error.detail || "Error desconocido"))
                }
            })
            .catch(err => {
                console.error(err)
                toast.error("Error de conexión al eliminar")
            })
    }

    const handleSave = (isocode: string, nombre: string) => {
        if (itemEditando) {
            // Actualizar
            fetch(`${API_BASE_URL}/api/monedas/${itemEditando.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isocode, moneda: nombre })
            }).then(res => {
                if (res.ok) {
                    toast.success('Moneda actualizada')
                    setModalOpen(false)
                    cargarMonedas()
                } else {
                    toast.error("Error al actualizar la moneda")
                }
            })
        } else {
            // Crear
            fetch(`${API_BASE_URL}/api/monedas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isocode, moneda: nombre })
            }).then(res => {
                if (res.ok) {
                    toast.success('Moneda creada')
                    setModalOpen(false)
                    cargarMonedas()
                } else {
                    toast.error("Error al crear la moneda")
                }
            })
        }
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'isocode' as const, label: 'Código ISO' },
        { key: 'nombre' as const, label: 'Nombre' },
    ]

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Monedas</h1>
                    <p className="text-gray-500 text-sm mt-1">Configura las divisas utilizadas en los movimientos</p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={monedas} columns={csvColumns} filenamePrefix="monedas" />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} />
                        Nueva Moneda
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <MonedasTable
                    monedas={monedas}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <MonedaModal
                isOpen={modalOpen}
                moneda={itemEditando}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    )
}
