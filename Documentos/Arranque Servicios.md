1. Arrancar el Docker Desktop

2. `docker-compose down`
   Detiene y elimina los contenedores y redes previos para asegurar un entorno limpio.

3. `docker-compose up -d --build`
   Construye las imágenes con los últimos cambios y levanta los servicios en segundo plano.

4. `docker-compose logs -f`
   Muestra los registros de los servicios en tiempo real para verificar su correcto funcionamiento.



## Opción B: Scripts de PowerShell (Si no se usa Docker)
Si Docker no está disponible, puede usar el script incluido:

1. Abrir PowerShell en la carpeta raíz del proyecto.
2. Ejecutar: `. .\servicios.ps1`
   Esto carga las funciones de ayuda.
3. Ejecutar: `Start-AllServices`
   Inicia Backend y Frontend en ventanas nuevas.

## Solución de Problemas
- **Error: "error during connect"**: Asegúrese de que Docker Desktop esté corriendo. Busque el icono de la ballena en la barra de tareas.
- **Puertos ocupados**: Si falla por puertos en uso (8000 o 5173), asegúrese de no tener otras instancias corriendo (`Stop-AllPython` en PowerShell o `docker-compose down`).
