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
        COP: { start: 0, end: 0, locale: 'es-CO' },
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

        let cleanStr = str

        if (currency === 'USD') {
            // Estilo US: 1,234.56 -> Boro comas
            cleanStr = str.replace(/,/g, '')
        } else {
            // Estilo CO: 1.234,56 -> Borro puntos, cambio coma por punto
            cleanStr = str.replace(/\./g, '').replace(',', '.')
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
            placeholder={currency === 'COP' ? '0' : '0,00'}
            className={`text-right font-mono ${colorClass} ${className}`}
        />
    )
}

