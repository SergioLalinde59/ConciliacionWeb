import { useState } from 'react'

export function useSessionStorage<T>(key: string, initialValue: T) {
    // Estado para almacenar nuestro valor
    // Pasamos la función inicial a useState para que solo se ejecute una vez
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.sessionStorage.getItem(key)
            // Parsear el item almacenado o retornar el valor inicial
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            console.error(`Error reading sessionStorage key "${key}":`, error)
            return initialValue
        }
    })

    // Retornamos una versión envuelta del setter de useState que persista el nuevo valor en sessionStorage
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            // Permitir que el valor sea una función para que tengamos la misma API que useState
            const valueToStore = value instanceof Function ? value(storedValue) : value
            // Guardar estado
            setStoredValue(valueToStore)
            // Guardar en sessionStorage
            window.sessionStorage.setItem(key, JSON.stringify(valueToStore))
        } catch (error) {
            console.error(`Error setting sessionStorage key "${key}":`, error)
        }
    }

    return [storedValue, setValue] as const
}
