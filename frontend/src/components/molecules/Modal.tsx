import { useEffect, useCallback, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface ModalProps {
    /** Si el modal está abierto */
    isOpen: boolean
    /** Callback al cerrar el modal */
    onClose: () => void
    /** Título del modal */
    title?: ReactNode
    /** Contenido del modal */
    children: ReactNode
    /** Tamaño del modal */
    size?: ModalSize
    /** Si mostrar el botón de cerrar en el header */
    showCloseButton?: boolean
    /** Si cerrar al hacer clic en el overlay */
    closeOnOverlayClick?: boolean
    /** Si cerrar al presionar Escape */
    closeOnEscape?: boolean
    /** Contenido del footer (botones de acción) */
    footer?: ReactNode
    /** Clases adicionales para el contenedor */
    className?: string
    /** Si el modal tiene padding en el contenido */
    padded?: boolean
}

const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
}

/**
 * Componente Modal base reutilizable
 * 
 * @example
 * // Modal simple
 * <Modal isOpen={isOpen} onClose={handleClose} title="Mi Modal">
 *   <p>Contenido del modal</p>
 * </Modal>
 * 
 * @example
 * // Modal con footer personalizado
 * <Modal 
 *   isOpen={isOpen} 
 *   onClose={handleClose} 
 *   title="Confirmar"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
 *       <Button onClick={handleConfirm}>Confirmar</Button>
 *     </>
 *   }
 * >
 *   <p>¿Estás seguro?</p>
 * </Modal>
 */
export const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    footer,
    className = '',
    padded = true,
}: ModalProps) => {
    // Cerrar con Escape
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
            onClose()
        }
    }, [onClose, closeOnEscape])

    // Agregar/remover listener de escape
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            // Prevenir scroll del body
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, handleEscape])

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && closeOnOverlayClick) {
            onClose()
        }
    }

    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={handleOverlayClick}
        >
            <div
                className={`
                    bg-white rounded-xl shadow-xl w-full overflow-hidden
                    animate-in fade-in zoom-in-95 duration-200
                    ${sizeClasses[size]}
                    ${className}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex justify-between items-center p-4 border-b border-gray-100">
                        {title && (
                            <h3 className="text-lg font-semibold text-gray-900">
                                {title}
                            </h3>
                        )}
                        {!title && <div />}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}

                {/* Contenido */}
                <div className={`${padded ? 'p-6' : ''} max-h-[calc(100vh-200px)] overflow-y-auto`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )

    // Renderizar en un portal para evitar problemas de z-index
    return createPortal(modalContent, document.body)
}

/**
 * Hook para manejar estado de modal
 */
export const useModal = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState)

    const open = useCallback(() => setIsOpen(true), [])
    const close = useCallback(() => setIsOpen(false), [])
    const toggle = useCallback(() => setIsOpen(prev => !prev), [])

    return { isOpen, open, close, toggle }
}
