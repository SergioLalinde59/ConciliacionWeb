import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { matchingService } from '../services/matching.service'
import { ConfiguracionMatchingForm } from '../components/organisms/ConfiguracionMatchingForm'
import type { ConfiguracionMatchingUpdate } from '../types/Matching'
import toast from 'react-hot-toast'

export const MatchingConfigPage = () => {
    const queryClient = useQueryClient()

    // Cargar configuración
    const { data: configuracion, isLoading, isError } = useQuery({
        queryKey: ['matching-config'],
        queryFn: matchingService.obtenerConfiguracion
    })

    const actualizarConfigMutation = useMutation({
        mutationFn: (config: ConfiguracionMatchingUpdate) => matchingService.actualizarConfiguracion(config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching-config'] })
            toast.success('Configuración actualizada correctamente')
        },
        onError: (error: any) => {
            toast.error('Error al actualizar: ' + (error.message || 'Error desconocido'))
        }
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (isError || !configuracion) {
        return (
            <div className="p-8 text-center text-red-600">
                <p>Error al cargar la configuración del matching.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Settings className="text-blue-600" size={28} />
                    <h1 className="text-2xl font-bold text-gray-900">Configuración Matching Inteligente</h1>
                </div>
                <p className="text-gray-500 text-sm">
                    Ajusta los parámetros y pesos del algoritmo de conciliación automática.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <ConfiguracionMatchingForm
                    configuracion={configuracion}
                    onSave={async (config) => { await actualizarConfigMutation.mutateAsync(config) }}
                    onCancel={() => window.history.back()}
                />
            </div>
        </div>
    )
}
