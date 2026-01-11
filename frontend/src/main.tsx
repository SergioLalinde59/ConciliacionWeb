import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setQueryClient } from './utils/queryClient'
import './index.css'
import App from './App.tsx'

// Configuración de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por defecto
      staleTime: 5 * 60 * 1000,
      // Reintentar 1 vez en caso de error
      retry: 1,
      // Revalidar al volver a enfocar la ventana
      refetchOnWindowFocus: false,
    },
  },
})

// Registrar queryClient globalmente para uso en servicios
setQueryClient(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
