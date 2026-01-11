import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    icon?: React.ElementType
    error?: string
}

export const Input = ({
    label,
    icon: Icon,
    error,
    className = '',
    ...props
}: InputProps) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                    {Icon && <Icon size={14} />}
                    {label}
                </label>
            )}
            <input
                className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${className} ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''}`}
                {...props}
            />
            {error && <span className="text-xs text-rose-500">{error}</span>}
        </div>
    )
}
