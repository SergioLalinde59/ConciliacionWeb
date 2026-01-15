import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '../../molecules/Modal'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { Select } from '../../atoms/Select'
import { Checkbox } from '../../atoms/Checkbox'

interface ConfigFiltroCentroCosto {
    id: number
    centro_costo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}

interface ConfigFiltroCentroCostoModalProps {
    isOpen: boolean
    config: ConfigFiltroCentroCosto | null
    centrosCostos: { id: number, nombre: string }[]
    onClose: () => void
    onSave: (centro_costo_id: number, etiqueta: string, activo_por_defecto: boolean) => void
}

/**
 * Modal para crear/editar configuración de filtros de centros de costos - Refactorizado con Modal base
 */
export const ConfigFiltroCentroCostoModal = ({ isOpen, config, centrosCostos, onClose, onSave }: ConfigFiltroCentroCostoModalProps) => {
    const [centroCostoId, setCentroCostoId] = useState<number>(0)
    const [etiqueta, setEtiqueta] = useState('')
    const [activoPorDefecto, setActivoPorDefecto] = useState(true)

    useEffect(() => {
        if (config) {
            setCentroCostoId(config.centro_costo_id)
            setEtiqueta(config.etiqueta)
            setActivoPorDefecto(config.activo_por_defecto)
        } else {
            setCentroCostoId(0)
            setEtiqueta('')
            setActivoPorDefecto(true)
        }
    }, [config, isOpen])

    const handleSubmit = () => {
        if (!centroCostoId || !etiqueta.trim()) return
        onSave(centroCostoId, etiqueta.trim(), activoPorDefecto)
    }

    const isValid = centroCostoId > 0 && etiqueta.trim()

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={config ? 'Editar Configuración' : 'Nueva Configuración'}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        icon={Save}
                        disabled={!isValid}
                    >
                        {config ? 'Actualizar' : 'Crear'}
                    </Button>
                </>
            }
        >
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-4">
                <Select
                    label="Centro de Costo *"
                    value={centroCostoId}
                    onChange={(e) => setCentroCostoId(Number(e.target.value))}
                >
                    <option value={0}>Seleccione un centro de costo...</option>
                    {centrosCostos.map((centro) => (
                        <option key={centro.id} value={centro.id}>
                            {centro.nombre}
                        </option>
                    ))}
                </Select>

                <Input
                    label="Etiqueta *"
                    value={etiqueta}
                    onChange={(e) => setEtiqueta(e.target.value)}
                    placeholder="Ej: Excluir Préstamos"
                    maxLength={100}
                />

                <div className="p-4 bg-gray-50 rounded-lg">
                    <Checkbox
                        id="activo-defecto"
                        checked={activoPorDefecto}
                        onChange={(e) => setActivoPorDefecto(e.target.checked)}
                        label="Activo por defecto"
                    />
                </div>
            </form>
        </Modal>
    )
}
