import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from './molecules/Modal'
import { Button } from './atoms/Button'
import { Input } from './atoms/Input'
import type { TipoMovimiento } from '../types'

interface Props {
    isOpen: boolean
    tipo: TipoMovimiento | null
    onClose: () => void
    onSave: (nombre: string) => void
}

/**
 * Modal para crear/editar tipos de movimiento - Refactorizado con Modal base
 */
export const TipoMovimientoModal = ({ isOpen, tipo, onClose, onSave }: Props) => {
    const [nombre, setNombre] = useState('')

    useEffect(() => {
        if (isOpen) setNombre(tipo ? tipo.nombre : '')
    }, [isOpen, tipo])

    const handleSubmit = () => {
        if (nombre.trim()) onSave(nombre)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={tipo ? 'Editar Tipo' : 'Nuevo Tipo'}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        icon={Save}
                        disabled={!nombre.trim()}
                    >
                        Guardar
                    </Button>
                </>
            }
        >
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
                <Input
                    label="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoFocus
                />
            </form>
        </Modal>
    )
}
