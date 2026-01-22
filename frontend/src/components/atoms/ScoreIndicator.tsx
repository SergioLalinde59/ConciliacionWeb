

interface ScoreIndicatorProps {
    score: number
    label?: string
    className?: string
    showPercentage?: boolean
    size?: 'sm' | 'md' | 'lg'
}

/**
 * Indicador visual del score de similitud
 * 
 * Muestra una barra de progreso con colores según el score:
 * - 0.95-1.00: Verde (excelente)
 * - 0.70-0.94: Amarillo (bueno)
 * - 0.00-0.69: Gris (bajo)
 */
export const ScoreIndicator = ({
    score,
    label,
    className = '',
    showPercentage = true,
    size = 'md'
}: ScoreIndicatorProps) => {
    // Normalizar score entre 0 y 1
    const normalizedScore = Math.max(0, Math.min(1, score))
    const percentage = Math.round(normalizedScore * 100)

    // Determinar color según el score
    const getColorClasses = () => {
        if (normalizedScore >= 0.95) {
            return {
                bg: 'bg-emerald-500',
                text: 'text-emerald-700',
                bgLight: 'bg-emerald-100'
            }
        } else if (normalizedScore >= 0.70) {
            return {
                bg: 'bg-amber-500',
                text: 'text-amber-700',
                bgLight: 'bg-amber-100'
            }
        } else {
            return {
                bg: 'bg-gray-400',
                text: 'text-gray-600',
                bgLight: 'bg-gray-100'
            }
        }
    }

    const colors = getColorClasses()

    // Tamaños
    const sizeClasses = {
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3'
    }

    const textSizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    }

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <div className="flex justify-between items-center">
                    <span className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
                        {label}
                    </span>
                    {showPercentage && (
                        <span className={`${textSizeClasses[size]} ${colors.text} font-semibold`}>
                            {percentage}%
                        </span>
                    )}
                </div>
            )}
            <div className={`w-full ${colors.bgLight} rounded-full overflow-hidden ${sizeClasses[size]}`}>
                <div
                    className={`${colors.bg} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={label || `Score: ${percentage}%`}
                />
            </div>
        </div>
    )
}
