import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '../../molecules/Modal'
import { Button } from '../../atoms/Button'
import { Input } from '../../atoms/Input'
import { ComboBox } from '../../molecules/ComboBox'
import type { Concepto, CentroCosto } from '../../../types'

interface Props {
    isOpen: boolean
    concepto: Concepto | null
    centrosCostos: CentroCosto[]
    conceptos: Concepto[]
    onClose: () => void
    onSave: (data: { nombre: string, centro_costo_id: number }) => void
}

/**
 * Modal para crear/editar conceptos - Refactorizado con Modal base
 */
export const ConceptoModal = ({ isOpen, concepto, centrosCostos, conceptos, onClose, onSave }: Props) => {
    const [nombre, setNombre] = useState('')
    const [centroCostoId, setCentroCostoId] = useState<string>('')
    const [errorNombre, setErrorNombre] = useState('')

    useEffect(() => {
        if (isOpen) {
            setNombre(concepto ? concepto.nombre : '')
            setCentroCostoId(concepto?.centro_costo_id?.toString() || '')
            setErrorNombre('')
        }
    }, [isOpen, concepto])

    const validarNombreUnico = () => {
        if (!nombre.trim() || !centroCostoId) return true

        const nombreNormalizado = nombre.trim().toLowerCase()
        const centroCostoIdInt = parseInt(centroCostoId)

        const existeConcepto = conceptos.some(c => {
            if (concepto && c.id === concepto.id) return false
            return c.nombre.toLowerCase() === nombreNormalizado && c.centro_costo_id === centroCostoIdInt
        })

        if (existeConcepto) {
            setErrorNombre('Ya existe un concepto con este nombre en el centro de costo seleccionado')
            return false
        }

        setErrorNombre('')
        return true
    }

    const handleSubmit = () => {
        if (!nombre.trim() || !centroCostoId) return
        if (!validarNombreUnico()) return

        onSave({
            nombre: nombre.trim(),
            centro_costo_id: parseInt(centroCostoId)
        })
    }

    const isValid = nombre.trim() && centroCostoId && !errorNombre

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
                {/* 1. Centro de Costo (primero) */}
                <ComboBox
                    label="Centro de Costo"
                    value={centroCostoId}
                    onChange={value => setCentroCostoId(value)}
                    options={centrosCostos}
                    placeholder="Seleccione o busque centro de costo..."
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

