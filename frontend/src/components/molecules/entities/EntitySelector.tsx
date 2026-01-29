import { useMemo } from 'react'
import { ComboBox } from '../ComboBox'
import type { LucideIcon } from 'lucide-react'

interface Entity {
    id: number | string
    nombre: string
    [key: string]: any
}

interface EntitySelectorProps {
    value: string | number
    onChange: (value: string) => void
    options: Entity[]
    label?: string
    icon?: LucideIcon
    placeholder?: string
    className?: string
    error?: string
    disabled?: boolean
    showAllOption?: boolean
    allOptionLabel?: string
}

export const EntitySelector = ({
    value,
    onChange,
    options,
    label,
    icon,
    placeholder = "Seleccionar...",
    className = '',
    error,
    disabled = false,
    showAllOption = false,
    allOptionLabel = "Todos"
}: EntitySelectorProps) => {

    // ComboBox expects { id, nombre }
    // We need to handle the "All" option if requested
    const comboBoxOptions = useMemo(() => {
        let opts = options.map(opt => ({
            id: opt.id, // Passthrough ID (can be string or number now)
            nombre: opt.nombre
        }))

        if (showAllOption) {
            return [{ id: '', nombre: allOptionLabel }, ...opts]
        }

        // ComboBox currently handles filtering internally, but we can prepend "All"
        // However, ComboBox is designed for database entities. "All" usually means empty value.
        // If showAllOption is true, we might just let the user clear the selection (which ComboBox supports).
        // Or adding a fake "All" entity.
        // For now, let's map it.

        return opts
    }, [options, showAllOption, allOptionLabel])

    return (
        <ComboBox
            label={label}
            value={value?.toString() || ''}
            onChange={onChange}
            options={comboBoxOptions}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            error={error}
            icon={icon}
        />
    )
}
