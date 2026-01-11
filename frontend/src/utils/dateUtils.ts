/**
 * Utilidades para manejo de fechas en formato ISO 8601 (YYYY-MM-DD)
 * sin problemas de desplazamiento por zona horaria.
 */

/**
 * Formatea un objeto Date a string YYYY-MM-DD local.
 */
export const formatDateISO = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD local.
 */
export const getTodayStr = (): string => {
    return formatDateISO(new Date())
}

/**
 * Parsea un string YYYY-MM-DD a un objeto Date local (a las 00:00:00).
 * Útil para comparaciones seguras.
 */
export const parseDateISO = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
}

/**
 * Verifica si una fecha es futura respecto a hoy (local).
 */
export const isFutureDate = (dateStr: string): boolean => {
    const target = parseDateISO(dateStr)
    const today = parseDateISO(getTodayStr())
    return target > today
}

// Date Range Helpers
export const getMesActual = () => {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    return { inicio: formatDateISO(inicio), fin: formatDateISO(fin) }
}

export const getMesAnterior = () => {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0)
    return { inicio: formatDateISO(inicio), fin: formatDateISO(fin) }
}

export const getUltimos3Meses = () => {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1)
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    return { inicio: formatDateISO(inicio), fin: formatDateISO(fin) }
}

export const getUltimos6Meses = () => {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1)
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    return { inicio: formatDateISO(inicio), fin: formatDateISO(fin) }
}

export const getAnioYTD = () => {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear(), 0, 1)
    // Para YTD, si se prefiere hasta hoy:
    const fin = ahora
    // Si se prefiere hasta fin de año, sería: new Date(ahora.getFullYear(), 11, 31)
    // Usaremos hoy por "Year To Date"
    return { inicio: formatDateISO(inicio), fin: formatDateISO(fin) }
}

export const getAnioAnterior = () => {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear() - 1, 0, 1)
    const fin = new Date(ahora.getFullYear() - 1, 11, 31)
    return { inicio: formatDateISO(inicio), fin: formatDateISO(fin) }
}

export const getUltimos12Meses = () => {
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear() - 1, ahora.getMonth() + 1, 1)
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    return { inicio: formatDateISO(inicio), fin: formatDateISO(fin) }
}
