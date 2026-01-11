import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    icon?: React.ElementType
    error?: string
    options?: Array<{ value: string | number; label: string }>
}

export const Select = ({
    label,
    icon: Icon,
    error,
    options,
    children,
    className = '',
    ...props
}: SelectProps) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                    {Icon && <Icon size={14} />}
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer ${className} ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''}`}
                    {...props}
                >
                    {children}
                    {options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {error && <span className="text-xs text-rose-500">{error}</span>}
        </div>
    )
}
