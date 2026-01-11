import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import type { TipoMovimiento } from '../types'
import { TiposMovimientoTable } from '../components/TiposMovimientoTable'
import { TipoMovimientoModal } from '../components/TipoMovimientoModal'
import { CsvExportButton } from '../components/CsvExportButton'
import { API_BASE_URL } from '../config'

export const TiposMovimientoPage = () => {
    const [tipos, setTipos] = useState<TipoMovimiento[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<TipoMovimiento | null>(null)

    const cargar = () => {
        setLoading(true)
        fetch(`${API_BASE_URL}/api/tipos-movimiento`)
            .then(res => res.json())
            .then(data => { setTipos(data); setLoading(false) })
            .catch(err => { console.error(err); setLoading(false) })
    }

    useEffect(() => { cargar() }, [])

    const handleCreate = () => { setItemEditando(null); setModalOpen(true) }
    const handleEdit = (item: TipoMovimiento) => { setItemEditando(item); setModalOpen(true) }
    const handleDelete = (id: number) => {
        fetch(`${API_BASE_URL}/api/tipos-movimiento/${id}`, { method: 'DELETE' })
            .then(async res => { if (res.ok) cargar(); else alert("Error al eliminar") })
    }

    const handleSave = (nombre: string) => {
        const method = itemEditando ? 'PUT' : 'POST'
        const url = itemEditando
            ? `${API_BASE_URL}/api/tipos-movimiento/${itemEditando.id}`
            : `${API_BASE_URL}/api/tipos-movimiento`

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipomov: nombre })
        }).then(res => {
            if (res.ok) { setModalOpen(false); cargar() }
            else alert("Error al guardar")
        })
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'nombre' as const, label: 'Nombre' },
    ]

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Tipos de Movimiento</h1>
                    <p className="text-gray-500 text-sm mt-1">Clasifica los movimientos (Ingreso, Egreso, etc.)</p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={tipos} columns={csvColumns} filenamePrefix="tipos_movimiento" />
                    <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium"><Plus size={18} /> Nuevo Tipo</button>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <TiposMovimientoTable tipos={tipos} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
            <TipoMovimientoModal isOpen={modalOpen} tipo={itemEditando} onClose={() => setModalOpen(false)} onSave={handleSave} />
        </div>
    )
}
