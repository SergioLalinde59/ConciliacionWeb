# Guía: Cómo agregar nuevas aplicaciones a tu Servidor Local

Sigue estos pasos cada vez que quieras agregar una nueva aplicación (como "Ventas", "Inventario", etc.) a tu entorno local.

## 1. Preparar la Aplicación
Cada aplicación debe correr en su propio puerto único.
*   **No uses:** 80, 81, 443 (Estos son del Proxy).
*   **Usa puertos libres:** 3000, 4000, 5000, 5174, etc.

**Ejemplo:**
Si tienes una app de Ventas, configúrala para que corra en el puerto `3000`.

## 2. Crear el Nombre (Dominio)
Dile a tu computadora que el nombre existe.
1.  Abre el "Bloc de notas" como **Administrador**.
2.  Abre el archivo: `C:\Windows\System32\drivers\etc\hosts`.
3.  Agrega una línea nueva al final:
    ```text
    127.0.0.1   ventas.local
    ```
4.  Guarda el archivo.

## 3. Conectar en el Proxy
Dile al Proxy Manager a dónde enviar el tráfico de ese nombre.
1.  Entra a **[http://localhost:81](http://localhost:81)**.
2.  Ve a **Hosts** -> **Proxy Hosts**.
3.  Botón **Add Proxy Host**.
4.  Datos:
    *   **Domain Names:** `ventas.local`
    *   **Scheme:** `http`
    *   **Forward Hostname / IP:** `host.docker.internal` (Siempre usa esto para apps en tu misma PC).
    *   **Forward Port:** `3000` (El puerto que elegiste en el paso 1).
5.  **Save**.

## 4. ¡Listo!
Ahora puedes entrar a **[http://ventas.local](http://ventas.local)** y verás tu aplicación.
