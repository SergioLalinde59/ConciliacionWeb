import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    icon?: React.ElementType
    error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
    label,
    icon: Icon,
    error,
    className = '',
    ...props
}, ref) => {
    return (
        <div className="space-y-1 w-full">
            {label && (
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5 ml-0.5">
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    ref={ref}
                    className={`
                        w-full bg-white border border-gray-200 rounded-lg text-sm 
                        outline-none transition-all duration-200 shadow-sm
                        placeholder:text-gray-400
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                        disabled:bg-gray-50 disabled:text-gray-500
                        ${Icon ? 'pl-10' : 'px-3'} py-1.5
                        ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'hover:border-gray-300'}
                        ${className}
                    `}
                    {...props}
                />
            </div>
            {error && <span className="text-xs text-rose-500 ml-0.5 font-medium animate-fadeIn">{error}</span>}
        </div>
    )
})

Input.displayName = 'Input'
