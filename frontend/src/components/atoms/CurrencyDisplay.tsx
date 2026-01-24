/**
 * CurrencyDisplay - Componente atómico para mostrar valores monetarios
 * 
 * Soporta COP, USD y TRM con formato apropiado para cada moneda.
 * Aplica colorización automática basada en el valor.
 */

import React from 'react'

export type CurrencyType = 'COP' | 'USD' | 'TRM'

interface CurrencyDisplayProps {
    value: number
    className?: string
    /** Tipo de moneda: COP, USD o TRM */
    currency?: CurrencyType
    /** Si se debe mostrar el símbolo de moneda */
    showSymbol?: boolean
    /** @deprecated Use showSymbol instead */
    showCurrency?: boolean
    /** Si se debe aplicar colorización automática */
    colorize?: boolean
    /** Si se debe mostrar signo + para positivos */
    showPlusSign?: boolean
}

/**
 * Opciones de formato para cada moneda
 */
const CURRENCY_CONFIG: Record<CurrencyType, { locale: string, options: Intl.NumberFormatOptions }> = {
    COP: {
        locale: 'es-CO',
        options: { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }
    },
    USD: {
        locale: 'en-US', // Usa punto para decimales como solicitado
        options: { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }
    },
    TRM: {
        locale: 'es-CO', // Usa punto miles y coma decimales
        options: { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 } // "COP" para formato pesos pero con decimales
    }
}

/**
 * Función utilitaria para formatear moneda (usar fuera de componentes React)
 * 
 * @example
 * formatCurrency(150000) // "$150.000"
 * formatCurrency(50.25, 'USD') // "$50.25"
 * formatCurrency(100000, 'COP', false) // "100.000"
 */
export const formatCurrency = (
    value: number,
    currency: CurrencyType = 'COP',
    showSymbol: boolean = true
): string => {
    const config = CURRENCY_CONFIG[currency]
    const numValue = Number(value)

    // Para TRM, si no mostramos símbolo, formateamos como número
    // Para evitar que salga COP 4.000,00 si el style es currency
    if (!showSymbol) {
        return numValue.toLocaleString(config.locale, {
            minimumFractionDigits: config.options.minimumFractionDigits,
            maximumFractionDigits: config.options.maximumFractionDigits
        })
    }

    return new Intl.NumberFormat(config.locale, config.options).format(numValue)
}

/**
 * Función para obtener solo el número formateado sin símbolo
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
    return Number(value).toLocaleString('es-CO', {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals
    })
}

/**
 * Obtiene la clase de color basada en el valor
 */
export const getNumberColorClass = (value: number): string => {
    if (value > 0) return 'text-emerald-600'
    if (value < 0) return 'text-red-600'
    return 'text-blue-600'
}

/**
 * Componente CurrencyDisplay
 * 
 * @example
 * // COP básico
 * <CurrencyDisplay value={150000} />
 * 
 * @example
 * // USD con colorización
 * <CurrencyDisplay value={-50.25} currency="USD" />
 * 
 * @example
 * // Sin símbolo, sin colorización
 * <CurrencyDisplay value={100000} showSymbol={false} colorize={false} />
 */
export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
    value,
    className = '',
    currency = 'COP',
    showSymbol,
    showCurrency, // deprecated alias for showSymbol
    colorize = true,
    showPlusSign = false
}) => {
    // Support deprecated showCurrency prop
    const shouldShowSymbol = showSymbol ?? showCurrency ?? true

    // Determinar el color basado en el valor
    const colorClass = colorize ? getNumberColorClass(value) : ''

    // Formatear el valor
    const formattedValue = formatCurrency(value, currency, shouldShowSymbol)

    // Agregar signo + si es positivo y está habilitado
    const displayValue = showPlusSign && value > 0
        ? `+${formattedValue}`
        : formattedValue

    return (
        <span className={`${colorClass} ${className}`}>
            {displayValue}
        </span>
    )
}

