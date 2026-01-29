
## Manejo de Errores

### Estrategias de Error Handling
1. **Errores de API**: Interceptados y mostrados con toast
2. **Error Boundaries**: Captura errores de renderizado
3. **Validación de Forms**: Feedback inmediato al usuario
4. **Retry Logic**: Reintentos automáticos con React Query
5. **Offline Detection**: Detección de pérdida de conexión

## Optimizaciones de Performance

### Code Splitting
- Lazy loading de páginas con `React.lazy()`
- Dynamic imports
- Chunks optimizados

### Memoización
- `React.memo()`: Componentes puros
- `useMemo()`: Cálculos costosos
- `useCallback()`: Funciones estables

### React Query Optimizations
- Stale time configurado
- Cache time optimizado
- Prefetching de datos
- Optimistic updates

### Bundle Optimization
- Tree shaking automático con Vite
- Minificación en producción
- CSS purging con Tailwind
- Assets optimization

## Docker y Producción

### Dockerfile
Multi-stage build:
1. **Build stage**: Compila la aplicación
2. **Production stage**: Sirve con Nginx

### Nginx Configuration
- Servidor estático optimizado
- Compresión gzip
- Caching headers
- SPA routing (redirect a index.html)
- Proxy reverso a API

## Configuración

### `config.ts`
Configuración centralizada:
```typescript
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  environment: import.meta.env.MODE,
  // ... más configuraciones
};
```
