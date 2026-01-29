
import { cn } from '../../../utils/cn'

interface EntityDisplayProps {
    id: number | string
    nombre: string
    className?: string
    idClassName?: string
    nameClassName?: string
}

export const EntityDisplay = ({
    id,
    nombre,
    className,
    idClassName,
    nameClassName
}: EntityDisplayProps) => {
    // If no ID or ID is 0/empty, just show name or placeholder
    if (!id || id === 0 || id === '0') {
        return <span className={cn("text-gray-500 italic", className)}>{nombre || 'Sin asignar'}</span>
    }

    return (
        <div className={cn("flex flex-row items-baseline gap-1.5", className)}>
            <span className={cn(
                "font-mono text-[11px] text-gray-400 bg-gray-50 px-1 rounded-sm border border-gray-100",
                idClassName
            )}>
                {id}
            </span>
            <span className={cn(
                "text-[13px] text-gray-700 font-medium truncate",
                nameClassName
            )} title={nombre}>
                {nombre}
            </span>
        </div>
    )
}
