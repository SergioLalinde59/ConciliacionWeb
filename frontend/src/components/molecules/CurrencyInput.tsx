import React, { useState, useEffect, useRef } from 'react'
import { Input } from '../atoms/Input'
import { getNumberColorClass } from '../atoms/CurrencyDisplay'

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
    value: number | null
    onChange: (value: number | null) => void
    currency?: 'COP' | 'USD' | 'TRM'
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
    value,
    onChange,
    currency = 'COP',
    className = '',
    ...props
}) => {
    const [displayValue, setDisplayValue] = useState('')
    const isFirstRender = useRef(true)

    // Configuración de formato según moneda
    const formatConfig = {
        COP: { start: 0, end: 2, locale: 'es-CO' },
        USD: { start: 2, end: 2, locale: 'en-US' },
        TRM: { start: 2, end: 2, locale: 'es-CO' }
    }[currency]

    // Formatear valor numérico a string
    const formatNumber = (num: number | null): string => {
        if (num === null || num === undefined) return ''
        return new Intl.NumberFormat(formatConfig.locale, {
            minimumFractionDigits: formatConfig.start,
            maximumFractionDigits: formatConfig.end
        }).format(num)
    }

    // Actualizar displayValue cuando cambia el prop value externamente
    useEffect(() => {
        if (isFirstRender.current) {
            setDisplayValue(formatNumber(value))
            isFirstRender.current = false
            return
        }

        // Solo actualizar si el valor prop cambia significativamente respecto al parseado actual
        const currentParsed = parseNumber(displayValue)
        if (value !== currentParsed) {
            setDisplayValue(formatNumber(value))
        }
    }, [value])

    // Parsear string formateado a número
    const parseNumber = (str: string): number | null => {
        if (!str || str === '-') return null

        // Si es USD, el punto es decimal y la coma es miles
        if (currency === 'USD') {
            const cleanStr = str.replace(/,/g, '')
            const num = parseFloat(cleanStr)
            return isNaN(num) ? null : num
        }

        // Para COP/TRM, detectamos heurísticamente si el último separador es decimal
        // Es decimal SI:
        // 1. Es una coma (es-CO standard)
        // 2. Es un punto Y solo hay uno Y no tiene 3 dígitos después (ej: 1.50)
        // 3. Es un punto Y hay más de uno, pero el último tiene != 3 dígitos (ej: 1.234.56)

        const lastSepMatch = str.match(/[.,](?=[^.,]*$)/)
        if (!lastSepMatch) {
            const num = parseFloat(str)
            return isNaN(num) ? null : num
        }

        const lastSep = lastSepMatch[0]
        const lastSepIndex = lastSepMatch.index!
        const afterLastSep = str.substring(lastSepIndex + 1)

        let isDecimal = false
        if (lastSep === ',') {
            isDecimal = true
        } else if (lastSep === '.') {
            // Si tiene exactamente 3 dígitos y hay otros puntos antes, probablemente es miles
            // Ej: 1.234.567 -> el .567 es miles
            // Ej: 3.178.83 -> el .83 es decimal
            const allPoints = str.split('.')
            if (afterLastSep.length !== 3) {
                isDecimal = true
            } else if (allPoints.length <= 2) {
                // Caso ambiguo "1.234". En COP asumimos miles por defecto.
                isDecimal = false
            } else {
                // "1.234.567" -> miles
                isDecimal = false
            }
        }

        let cleanStr = ''
        if (isDecimal) {
            // Borrar todos los separadores anteriores, dejar el último como punto
            const before = str.substring(0, lastSepIndex).replace(/[.,]/g, '')
            cleanStr = before + '.' + afterLastSep
        } else {
            // Borrar todos los separadores (miles)
            cleanStr = str.replace(/[.,]/g, '')
        }

        const num = parseFloat(cleanStr)
        return isNaN(num) ? null : num
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value

        // Validar caracteres permitidos: números, puntos, comas, guión al inicio
        // Regex simplificado que permite estructura básica, validación estricta al parsear
        if (!/^-?[0-9.,]*$/.test(newVal)) return

        setDisplayValue(newVal)

        // Actualizar el padre con el valor numerico
        const numVal = parseNumber(newVal)
        onChange(numVal)
    }

    const handleBlur = () => {
        // Al salir, formatear bonito lo que haya
        const num = parseNumber(displayValue)
        setDisplayValue(formatNumber(num))
    }

    // Calcular color del texto basado en el valor
    const colorClass = value !== null ? getNumberColorClass(value) : 'text-gray-900'

    return (
        <Input
            {...props}
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={(e) => {
                handleBlur()
                props.onBlur?.(e)
            }}
            placeholder={currency === 'USD' ? '0.00' : (currency === 'TRM' ? '0,00' : '0,00')}
            className={`text-right font-mono ${colorClass} ${className}`}
        />
    )
}

