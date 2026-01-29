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
        console.log(`[SelectorCuenta] Filtrando: Total=${cuentas?.length}, SoloConciliables=${soloConciliables}, SoloPermiteCarga=${soloPermiteCarga} -> Result=${result.length}`);
        return result
    }, [cuentas, soloConciliables, soloPermiteCarga])

    // Map properties for EntitySelector
    // Backend returns: { cuentaid, cuenta, ... }
    // EntitySelector expects: { id, nombre }
    const mappedCuentas = useMemo(() => {
        return filteredCuentas.map((c: any) => ({
            ...c,
            id: c.cuentaid || c.id,
            nombre: c.cuenta || c.nombre
        }))
    }, [filteredCuentas])

    return (
        <EntitySelector
            label={label}
            icon={CreditCard}
            value={value}
            onChange={onChange}
            options={mappedCuentas}
            className={className}
            error={error}
            disabled={disabled}
            showAllOption={showTodas}
            allOptionLabel="Todas las cuentas"
        />
    )
}
