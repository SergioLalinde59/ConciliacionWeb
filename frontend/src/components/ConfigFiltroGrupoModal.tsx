import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from './molecules/Modal'
import { Button } from './atoms/Button'
import { Input } from './atoms/Input'
import { Select } from './atoms/Select'
import { Checkbox } from './atoms/Checkbox'

interface ConfigFiltroGrupo {
    id: number
    grupo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}

interface ConfigFiltroGrupoModalProps {
    isOpen: boolean
    config: ConfigFiltroGrupo | null
    grupos: { id: number, nombre: string }[]
    onClose: () => void
    onSave: (grupo_id: number, etiqueta: string, activo_por_defecto: boolean) => void
}

/**
 * Modal para crear/editar configuración de filtros de grupos - Refactorizado con Modal base
 */
export const ConfigFiltroGrupoModal = ({ isOpen, config, grupos, onClose, onSave }: ConfigFiltroGrupoModalProps) => {
    const [grupoId, setGrupoId] = useState<number>(0)
    const [etiqueta, setEtiqueta] = useState('')
    const [activoPorDefecto, setActivoPorDefecto] = useState(true)

    useEffect(() => {
        if (config) {
            setGrupoId(config.grupo_id)
            setEtiqueta(config.etiqueta)
            setActivoPorDefecto(config.activo_por_defecto)
        } else {
            setGrupoId(0)
            setEtiqueta('')
            setActivoPorDefecto(true)
        }
    }, [config, isOpen])

    const handleSubmit = () => {
        if (!grupoId || !etiqueta.trim()) return
        onSave(grupoId, etiqueta.trim(), activoPorDefecto)
    }

    const isValid = grupoId > 0 && etiqueta.trim()

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
                    label="Grupo *"
                    value={grupoId}
                    onChange={(e) => setGrupoId(Number(e.target.value))}
                >
                    <option value={0}>Seleccione un grupo...</option>
                    {grupos.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                            {grupo.nombre}
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
