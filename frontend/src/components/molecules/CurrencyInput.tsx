import { useState, useEffect, useRef } from 'react'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string | number
    onValueChange: (val: string) => void
}

export const CurrencyInput = ({ value, onValueChange, className = '', ...props }: CurrencyInputProps) => {
    const [display, setDisplay] = useState('')
    const isEditing = useRef(false)

    // Parsear valor del input (con formato es-CO) a valor numérico JS
    // "1.000,50" -> "1000.50" | "-1.000,50" -> "-1000.50"
    const parse = (val: string) => {
        // Preservar signo negativo
        const isNegative = val.startsWith('-')
        // Eliminar puntos de miles
        let clean = val.replace(/\./g, '')
        // Reemplazar coma decimal por punto
        clean = clean.replace(',', '.')
        // Asegurar que el signo negativo esté presente si lo había
        if (isNegative && !clean.startsWith('-')) {
            clean = '-' + clean
        }
        return clean
    }

    // Formatear valor numérico JS a formato visual es-CO
    // "1000.50" -> "1.000,50" | "-1000.50" -> "-1.000,50"
    const format = (val: string | number) => {
        if (val === '' || val === undefined || val === null) return ''

        const valStr = val.toString()

        // Manejar signo negativo
        const isNegative = valStr.startsWith('-')
        const absValStr = isNegative ? valStr.slice(1) : valStr

        // Manejar el caso de string intermedio que termina en punto (convertido de coma)
        // Ejemplo val="123." -> queremos mostrar "123,"
        if (absValStr.endsWith('.')) {
            const clean = absValStr.slice(0, -1)
            const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
            return `${isNegative ? '-' : ''}${formatted},`
        }

        const num = parseFloat(absValStr)
        if (isNaN(num)) return ''

        const parts = absValStr.split('.')
        const integerPart = parts[0]
        const decimalPart = parts[1]

        const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

        if (decimalPart !== undefined) {
            return `${isNegative ? '-' : ''}${formattedInt},${decimalPart}`
        }
        return `${isNegative ? '-' : ''}${formattedInt}`
    }

    useEffect(() => {
        if (!isEditing.current) {
            setDisplay(format(value))
        }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value

        // Permitir solo dígitos, puntos, comas y signo negativo al inicio
        // Regex: opcionalmente un guión al inicio, seguido de dígitos, puntos y comas
        if (!/^-?[\d.,]*$/.test(input)) return

        setDisplay(input)

        // Calcular valor real
        let raw = parse(input)

        // Validar que sea un número válido o un guión solo (inicio de negativo)
        if (raw === '' || raw === '-' || !isNaN(Number(raw))) {
            onValueChange(raw)
        }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        isEditing.current = false
        setDisplay(format(value))
        if (props.onBlur) props.onBlur(e)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        isEditing.current = true
        if (props.onFocus) props.onFocus(e)
    }

    return (
        <input
            {...props}
            type="text"
            value={display}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={`text-right ${className}`} // Alineación derecha por defecto para números
        />
    )
}
