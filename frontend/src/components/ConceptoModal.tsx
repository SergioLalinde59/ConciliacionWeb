import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from './molecules/Modal'
import { Button } from './atoms/Button'
import { Input } from './atoms/Input'
import { ComboBox } from './molecules/ComboBox'
import type { Concepto, Grupo } from '../types'

interface Props {
    isOpen: boolean
    concepto: Concepto | null
    grupos: Grupo[]
    conceptos: Concepto[]
    onClose: () => void
    onSave: (data: { nombre: string, grupo_id: number }) => void
}

/**
 * Modal para crear/editar conceptos - Refactorizado con Modal base
 */
export const ConceptoModal = ({ isOpen, concepto, grupos, conceptos, onClose, onSave }: Props) => {
    const [nombre, setNombre] = useState('')
    const [grupoId, setGrupoId] = useState<string>('')
    const [errorNombre, setErrorNombre] = useState('')

    useEffect(() => {
        if (isOpen) {
            setNombre(concepto ? concepto.nombre : '')
            setGrupoId(concepto?.grupo_id?.toString() || '')
            setErrorNombre('')
        }
    }, [isOpen, concepto])

    const validarNombreUnico = () => {
        if (!nombre.trim() || !grupoId) return true

        const nombreNormalizado = nombre.trim().toLowerCase()
        const grupoIdInt = parseInt(grupoId)

        const existeConcepto = conceptos.some(c => {
            if (concepto && c.id === concepto.id) return false
            return c.nombre.toLowerCase() === nombreNormalizado && c.grupo_id === grupoIdInt
        })

        if (existeConcepto) {
            setErrorNombre('Ya existe un concepto con este nombre en el grupo seleccionado')
            return false
        }

        setErrorNombre('')
        return true
    }

    const handleSubmit = () => {
        if (!nombre.trim() || !grupoId) return
        if (!validarNombreUnico()) return

        onSave({
            nombre: nombre.trim(),
            grupo_id: parseInt(grupoId)
        })
    }

    const isValid = nombre.trim() && grupoId && !errorNombre

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={concepto ? 'Editar Concepto' : 'Nuevo Concepto'}
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
                {/* 1. Grupo (primero) */}
                <ComboBox
                    label="Grupo"
                    value={grupoId}
                    onChange={value => setGrupoId(value)}
                    options={grupos}
                    placeholder="Seleccione o busque grupo..."
                    required
                    autoFocus
                />

                {/* 2. Nombre del Concepto */}
                <Input
                    label="Nombre del Concepto *"
                    value={nombre}
                    onChange={(e) => {
                        setNombre(e.target.value)
                        setErrorNombre('')
                    }}
                    onBlur={validarNombreUnico}
                    placeholder="Ej: Mercado Mensual"
                    error={errorNombre}
                />
            </form>
        </Modal>
    )
}

