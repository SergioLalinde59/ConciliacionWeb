# Diagnóstico y Reparación de Facturas.local

## Contexto
La aplicación muestra una página en blanco tras la refactorización a Atomic Design. El servidor (Vite) y el proxy (Nginx) están funcionando. El objetivo es identificar y corregir la causa de que los componentes `Sidebar` y `Header` no se rendericen.

## Pasos de Trabajo

- [x] Diagnóstico de Errores de Frontend <!-- id: 0 -->
    - [x] Verificar consola del navegador por errores de JavaScript o React.
    - [x] Verificar existencia y carga de hojas de estilo críticas (`tokens.css`, `App.css`).
    - [x] Inspeccionar el DOM para ver si los componentes están montados pero ocultos.
- [x] Revisión de Integración de Componentes <!-- id: 1 -->
    - [x] Verificar importaciones y exportaciones de `Sidebar` y componentes `atoms`/`molecules`.
    - [x] Configurar plan de corrección para archivos afectados.
- [x] Corrección de Código <!-- id: 2 -->
    - [x] Aplicar correcciones en `App.tsx` o componentes específicos según hallazgos.
    - [x] Restaurar visibilidad de la interfaz.
- [x] Verificación Final <!-- id: 3 -->
    - [x] Confirmar carga correcta de `facturas.local`.
