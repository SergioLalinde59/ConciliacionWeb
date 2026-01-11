import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import type { Cuenta } from '../types'
import { CuentasTable } from '../components/CuentasTable'
import { CuentaModal } from '../components/CuentaModal'
import { CsvExportButton } from '../components/CsvExportButton'
import { API_BASE_URL } from '../config'

export const CuentasPage = () => {
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<Cuenta | null>(null)

    const cargarCuentas = () => {
        setLoading(true)
        fetch(`${API_BASE_URL}/api/cuentas`)
            .then(res => res.json())
            .then(data => {
                setCuentas(data)
                setLoading(false)
            })
            .catch(err => {
                console.error("Error cargando cuentas:", err)
                setLoading(false)
            })
    }

    useEffect(() => {
        cargarCuentas()
    }, [])

    const handleCreate = () => {
        setItemEditando(null)
        setModalOpen(true)
    }

    const handleEdit = (cuenta: Cuenta) => {
        setItemEditando(cuenta)
        setModalOpen(true)
    }

    const handleDelete = (id: number) => {
        fetch(`${API_BASE_URL}/api/cuentas/${id}`, { method: 'DELETE' })
            .then(async res => {
                if (res.ok) {
                    toast.success('Cuenta eliminada')
                    cargarCuentas()
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

    const handleSave = (data: { nombre: string, permite_carga: boolean }) => {
        if (itemEditando) {
            // Actualizar
            fetch(`${API_BASE_URL}/api/cuentas/${itemEditando.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cuenta: data.nombre, permite_carga: data.permite_carga })
            }).then(res => {
                if (res.ok) {
                    toast.success('Cuenta actualizada')
                    setModalOpen(false)
                    cargarCuentas()
                } else {
                    toast.error("Error al actualizar la cuenta")
                }
            })
        } else {
            // Crear
            fetch(`${API_BASE_URL}/api/cuentas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cuenta: data.nombre, permite_carga: data.permite_carga })
            }).then(res => {
                if (res.ok) {
                    toast.success('Cuenta creada')
                    setModalOpen(false)
                    cargarCuentas()
                } else {
                    toast.error("Error al crear la cuenta")
                }
            })
        }
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'nombre' as const, label: 'Nombre' },
    ]

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Cuentas</h1>
                    <p className="text-gray-500 text-sm mt-1">Administra las cuentas bancarias y de efectivo</p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={cuentas} columns={csvColumns} filenamePrefix="cuentas" />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} />
                        Nueva Cuenta
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <CuentasTable
                    cuentas={cuentas}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <CuentaModal
                isOpen={modalOpen}
                cuenta={itemEditando}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    )
}
