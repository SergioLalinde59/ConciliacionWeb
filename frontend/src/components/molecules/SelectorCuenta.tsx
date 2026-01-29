import React, { useMemo } from 'react'
import { EntitySelector } from './entities/EntitySelector'
import { useCatalogo } from '../../hooks/useCatalogo'
import { CreditCard } from 'lucide-react'
import type { Cuenta } from '../../types'

interface SelectorCuentaProps {
    value: string | number
    onChange: (value: string) => void
    soloConciliables?: boolean
    soloPermiteCarga?: boolean
    label?: string
    showTodas?: boolean
    className?: string
    error?: string
    disabled?: boolean
}

export const SelectorCuenta: React.FC<SelectorCuentaProps> = ({
    value,
    onChange,
    soloConciliables = true,
    soloPermiteCarga = false,
    label = "Cuenta",
    showTodas = false,
    className = '',
    error,
    disabled = false
}) => {
    const { cuentas } = useCatalogo()

    const filteredCuentas = useMemo(() => {
        if (!cuentas) return []
        let result = cuentas
        if (soloConciliables) {
            result = result.filter((c: Cuenta) => c.permite_conciliar)
        }
        if (soloPermiteCarga) {
            result = result.filter((c: Cuenta) => c.permite_carga)
        }
        return result
    }, [cuentas, soloConciliables, soloPermiteCarga])

    // Options are now handled by EntitySelector, we just pass the entities
    // But EntitySelector expects { id, nombre }
    // Cuenta has { id, nombre, ... } which is compatible.

    return (
        <EntitySelector
            label={label}
            icon={CreditCard}
            value={value}
            onChange={onChange}
            options={filteredCuentas}
            className={className}
            error={error}
            disabled={disabled}
            showAllOption={showTodas}
            allOptionLabel="Todas las cuentas"
        />
    )
}
