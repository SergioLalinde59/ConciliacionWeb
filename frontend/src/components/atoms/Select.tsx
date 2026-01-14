import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    icon?: React.ElementType
    error?: string
    options?: Array<{ value: string | number; label: string }>
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
    label,
    icon: Icon,
    error,
    options,
    children,
    className = '',
    ...props
}, ref) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5 ml-0.5">
                    {Icon && <Icon size={14} />}
                    {label}
                </label>
            )}
            <div className="relative group">
                <select
                    ref={ref}
                    className={`
                        w-full bg-white border border-gray-200 rounded-lg text-sm 
                        outline-none transition-all duration-200 shadow-sm appearance-none cursor-pointer
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                        disabled:bg-gray-50 disabled:text-gray-500
                        pl-3 pr-10 py-2.5
                        ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'hover:border-gray-300'}
                        ${className}
                    `}
                    {...props}
                >
                    {children}
                    {options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {error && <span className="text-xs text-rose-500 ml-0.5 font-medium animate-fadeIn">{error}</span>}
        </div>
    )
})

Select.displayName = 'Select'
