import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from './molecules/Modal'
import { Button } from './atoms/Button'
import { Input } from './atoms/Input'

import type { Grupo } from '../types'

interface Props {
    isOpen: boolean
    grupo: Grupo | null
    grupos: Grupo[]
    onClose: () => void
    onSave: (nombre: string) => void
}

/**
 * Modal para crear/editar grupos - Refactorizado con Modal base
 */
export const GrupoModal = ({ isOpen, grupo, grupos, onClose, onSave }: Props) => {
    const [nombre, setNombre] = useState('')
    const [errorNombre, setErrorNombre] = useState('')

    useEffect(() => {
        if (isOpen) {
            setNombre(grupo ? grupo.nombre : '')
            setErrorNombre('')
        }
    }, [isOpen, grupo])

    const validarNombreUnico = (val: string) => {
        const nombreLimpio = val.trim().toLowerCase()
        if (!nombreLimpio) return true

        const existe = grupos.some(g => {
            if (grupo && g.id === grupo.id) return false
            return g.nombre.toLowerCase() === nombreLimpio
        })

        if (existe) {
            setErrorNombre('Ya existe un grupo con este nombre')
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
            title={grupo ? 'Editar Grupo' : 'Nuevo Grupo'}
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
                    label="Nombre del Grupo"
                    value={nombre}
                    onChange={(e) => {
                        setNombre(e.target.value)
                        if (errorNombre) setErrorNombre('')
                    }}
                    onBlur={(e) => validarNombreUnico(e.target.value)}
                    placeholder="Ej: Préstamos"
                    error={errorNombre}
                    autoFocus
                />
            </form>
        </Modal>
    )
}
