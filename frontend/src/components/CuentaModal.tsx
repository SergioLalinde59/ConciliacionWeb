import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from './molecules/Modal'
import { Button } from './atoms/Button'
import { Input } from './atoms/Input'
import { Checkbox } from './atoms/Checkbox'
import type { Cuenta } from '../types'

interface Props {
    isOpen: boolean
    cuenta: Cuenta | null
    onClose: () => void
    onSave: (data: { nombre: string; permite_carga: boolean }) => void
}

/**
 * Modal para crear/editar cuentas - Refactorizado con Modal base
 */
export const CuentaModal = ({ isOpen, cuenta, onClose, onSave }: Props) => {
    const [nombre, setNombre] = useState('')
    const [permiteCarga, setPermiteCarga] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setNombre(cuenta ? cuenta.nombre : '')
            setPermiteCarga(cuenta ? cuenta.permite_carga : false)
        }
    }, [isOpen, cuenta])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!nombre.trim()) return
        onSave({ nombre, permite_carga: permiteCarga })
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={cuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => nombre.trim() && onSave({ nombre, permite_carga: permiteCarga })}
                        icon={Save}
                        disabled={!nombre.trim()}
                    >
                        Guardar
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Nombre de la Cuenta"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Davivienda Ahorros"
                    autoFocus
                />

                <Checkbox
                    label="Permitir carga de archivos (Movimientos)"
                    checked={permiteCarga}
                    onChange={(e) => setPermiteCarga(e.target.checked)}
                />
            </form>
        </Modal>
    )
}
