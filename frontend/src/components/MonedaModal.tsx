import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from './molecules/Modal'
import { Button } from './atoms/Button'
import { Input } from './atoms/Input'
import type { Moneda } from '../types'

interface Props {
    isOpen: boolean
    moneda: Moneda | null
    onClose: () => void
    onSave: (isocode: string, nombre: string) => void
}

/**
 * Modal para crear/editar monedas - Refactorizado con Modal base
 */
export const MonedaModal = ({ isOpen, moneda, onClose, onSave }: Props) => {
    const [isocode, setIsocode] = useState('')
    const [nombre, setNombre] = useState('')

    useEffect(() => {
        if (isOpen) {
            setIsocode(moneda ? moneda.isocode : '')
            setNombre(moneda ? moneda.nombre : '')
        }
    }, [isOpen, moneda])

    const handleSubmit = () => {
        if (!isocode.trim() || !nombre.trim()) return
        onSave(isocode, nombre)
    }

    const isValid = isocode.trim() && nombre.trim()

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={moneda ? 'Editar Moneda' : 'Nueva Moneda'}
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
                        Guardar
                    </Button>
                </>
            }
        >
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-4">
                <Input
                    label="Código ISO"
                    value={isocode}
                    onChange={(e) => setIsocode(e.target.value.substring(0, 3).toUpperCase())}
                    placeholder="COP"
                    maxLength={3}
                    className="uppercase"
                    autoFocus
                />
                <Input
                    label="Nombre de la Moneda"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Peso Colombiano"
                />
            </form>
        </Modal>
    )
}
