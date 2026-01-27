import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '../../molecules/Modal'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { Select } from '../../atoms/Select'
import { Checkbox } from '../../atoms/Checkbox'

interface ConfigValorPendiente {
    id: number
    tipo: string
    valor_id: number
    descripcion: string
    activo: boolean
}

interface ConfigValorPendienteModalProps {
    isOpen: boolean
    config: ConfigValorPendiente | null
    onClose: () => void
    onSave: (tipo: string, valor_id: number, descripcion: string, activo: boolean) => void
}

export const ConfigValorPendienteModal = ({ isOpen, config, onClose, onSave }: ConfigValorPendienteModalProps) => {
    const [tipo, setTipo] = useState('')
    const [valorId, setValorId] = useState<number>(0)
    const [descripcion, setDescripcion] = useState('')
    const [activo, setActivo] = useState(true)

    useEffect(() => {
        if (config) {
            setTipo(config.tipo)
            setValorId(config.valor_id)
            setDescripcion(config.descripcion)
            setActivo(config.activo)
        } else {
            setTipo('')
            setValorId(0)
            setDescripcion('')
            setActivo(true)
        }
    }, [config, isOpen])

    const handleSubmit = () => {
        if (!tipo || !valorId) return
        onSave(tipo, valorId, descripcion.trim(), activo)
    }

    const isValid = tipo !== '' && valorId > 0

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={config ? 'Editar Valor Pendiente' : 'Nuevo Valor Pendiente'}
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
                    label="Tipo de Entidad *"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                >
                    <option value="">Seleccione un tipo...</option>
                    <option value="centro_costo">Centro de Costo</option>
                    <option value="tercero">Tercero</option>
                    <option value="concepto">Concepto</option>
                    <option value="cuenta">Cuenta</option>
                </Select>

                <Input
                    label="ID del Valor *"
                    type="number"
                    value={valorId}
                    onChange={(e) => setValorId(Number(e.target.value))}
                    placeholder="ID del registro a ignorar"
                    min={1}
                />

                <Input
                    label="Descripción"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: Centro de costo administrativo temporal"
                    maxLength={255}
                />

                <div className="p-4 bg-gray-50 rounded-lg">
                    <Checkbox
                        id="activo-pendiente"
                        checked={activo}
                        onChange={(e) => setActivo(e.target.checked)}
                        label="Configuración Activa"
                    />
                </div>
            </form>
        </Modal>
    )
}
