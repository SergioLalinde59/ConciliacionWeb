import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from './molecules/Modal'
import { Button } from './atoms/Button'
import { Input } from './atoms/Input'
import type { Tercero } from '../types'

interface Props {
    isOpen: boolean
    tercero: Tercero | null
    initialValues?: { nombre?: string }
    onClose: () => void
    onSave: (nombre: string) => void
}

/**
 * Modal para crear/editar terceros - Simplificado después de 3NF
 * Los campos descripcion y referencia ahora están en tercero_descripciones
 */
export const TerceroModal = ({ isOpen, tercero, initialValues, onClose, onSave }: Props) => {
    const [nombre, setNombre] = useState('')

    useEffect(() => {
        if (isOpen) {
            if (tercero) {
                setNombre(tercero.nombre)
            } else {
                setNombre(initialValues?.nombre || '')
            }
        }
    }, [isOpen, tercero, initialValues])

    const handleSubmit = () => {
        if (nombre.trim()) {
            onSave(nombre)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={tercero ? 'Editar Tercero' : 'Nuevo Tercero'}
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
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-4">
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
