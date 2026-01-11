import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'

interface ComboBoxOption {
    id: number
    nombre: string
}

interface ComboBoxProps {
    value: string
    onChange: (value: string) => void
    options: ComboBoxOption[]
    placeholder?: string
    label?: string
    required?: boolean
    disabled?: boolean
    autoFocus?: boolean
}

export const ComboBox = ({ value, onChange, options, placeholder, label, required, disabled, autoFocus }: ComboBoxProps) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [filteredOptions, setFilteredOptions] = useState<ComboBoxOption[]>(options)
    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Actualizar el texto mostrado cuando cambia el valor
    useEffect(() => {
        if (value) {
            const selected = options.find(opt => opt.id.toString() === value)
            if (selected) {
                setSearchTerm(`${selected.id} - ${selected.nombre}`)
            } else {
                // Si hay un valor pero no se encuentra en las opciones actuales
                // (por ejemplo si se borró de la base o no se ha cargado)
                setSearchTerm(value)
            }
        } else {
            setSearchTerm('')
        }
    }, [value, options])

    // Filtrar opciones cuando cambia el término de búsqueda
    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            const filtered = options.filter(opt => {
                const fullText = `${opt.id} - ${opt.nombre}`.toLowerCase()
                const idStr = opt.id.toString()
                const nombre = opt.nombre.toLowerCase()
                return fullText.includes(term) || idStr.includes(term) || nombre.includes(term)
            })
            setFilteredOptions(filtered)
        } else {
            setFilteredOptions(options)
        }
    }, [searchTerm, options])

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setSearchTerm(newValue)
        setShowDropdown(true)

        // Si está vacío, limpiar selección
        if (!newValue) {
            onChange('')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm) {
            e.preventDefault()

            // 1. Intentar buscar por ID exacto primero
            const idMatch = searchTerm.match(/^\d+/)
            if (idMatch) {
                const id = parseInt(idMatch[0])
                const option = options.find(opt => opt.id === id)
                if (option) {
                    selectOption(option)
                    return
                }
            }

            // 2. Si no hay ID exacto, pero hay opciones filtradas, seleccionar la primera
            if (filteredOptions.length > 0) {
                selectOption(filteredOptions[0])
            }
        }

        if (e.key === 'Escape') {
            setShowDropdown(false)
            inputRef.current?.blur()
        }
    }

    const selectOption = (option: ComboBoxOption) => {
        onChange(option.id.toString())
        setSearchTerm(`${option.id} - ${option.nombre}`)
        setShowDropdown(false)
        inputRef.current?.blur()
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setShowDropdown(true)
        e.target.select() // Select all text on focus
    }

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setSearchTerm('')
        onChange('')
        setFilteredOptions(options)
        inputRef.current?.focus()
    }

    const toggleDropdown = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        if (showDropdown) {
            setShowDropdown(false)
        } else {
            setShowDropdown(true)
            inputRef.current?.focus()
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {label && (
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2 mb-1.5">
                    {label}{required && <span className="text-rose-500">*</span>}
                </label>
            )}

            <div className="relative group">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    placeholder={placeholder || 'Buscar...'}
                    disabled={disabled}
                    className={`w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : 'hover:border-gray-300'}`}
                    required={required}
                    autoFocus={autoFocus}
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchTerm && !disabled && (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="p-1 text-gray-300 hover:text-gray-500 rounded-md transition-colors"
                            tabIndex={-1}
                            title="Limpiar"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        className={`p-1 text-gray-400 rounded-md transition-colors ${!disabled ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                        onClick={!disabled ? toggleDropdown : undefined}
                        tabIndex={-1}
                    >
                        <ChevronDown size={14} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {showDropdown && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <div
                                key={option.id}
                                onMouseDown={(e) => {
                                    e.preventDefault() // Prevent blur before click
                                    selectOption(option)
                                }}
                                className={`px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm transition-colors border-b border-gray-50 last:border-0 flex items-center gap-2 ${value === option.id.toString() ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                                    }`}
                            >
                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 w-10 text-center">
                                    {option.id}
                                </span>
                                <span className="truncate">{option.nombre}</span>
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-4 text-center">
                            <p className="text-sm text-gray-400 italic">No se encontraron resultados</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
