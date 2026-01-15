import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '../../molecules/Modal'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'

import type { CentroCosto } from '../../../types'

interface Props {
    isOpen: boolean
    centroCosto: CentroCosto | null
    centrosCostos: CentroCosto[]
    onClose: () => void
    onSave: (nombre: string) => void
}

/**
 * Modal para crear/editar centros de costos - Refactorizado con Modal base
 */
export const CentroCostoModal = ({ isOpen, centroCosto, centrosCostos, onClose, onSave }: Props) => {
    const [nombre, setNombre] = useState('')
    const [errorNombre, setErrorNombre] = useState('')

    useEffect(() => {
        if (isOpen) {
            setNombre(centroCosto ? centroCosto.nombre : '')
            setErrorNombre('')
        }
    }, [isOpen, centroCosto])

    const validarNombreUnico = (val: string) => {
        const nombreLimpio = val.trim().toLowerCase()
        if (!nombreLimpio) return true

        const existe = centrosCostos.some(c => {
            if (centroCosto && c.id === centroCosto.id) return false
            return c.nombre.toLowerCase() === nombreLimpio
        })

        if (existe) {
            setErrorNombre('Ya existe un centro de costo con este nombre')
            return false
        }

        setErrorNombre('')
        return true
    }

    const handleSubmit = () => {
        const nombreTrim = nombre.trim()
        if (!nombreTrim) return
        if (!validarNombreUnico(nombreTrim)) return
        onSave(nombreTrim)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={centroCosto ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        icon={Save}
                        disabled={!nombre.trim() || !!errorNombre}
                    >
                        Guardar
                    </Button>
                </>
            }
        >
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-4">
                <Input
                    label="Nombre del Centro de Costo"
                    value={nombre}
                    onChange={(e) => {
                        setNombre(e.target.value)
                        if (errorNombre) setErrorNombre('')
                    }}
                    onBlur={(e) => validarNombreUnico(e.target.value)}
                    placeholder="Ej: Administración"
                    error={errorNombre}
                    autoFocus
                />
            </form>
        </Modal>
    )
}
