# Configuración Docker - ConciliacionWeb

Este documento describe la configuración Docker de la aplicación **ConciliacionWeb** y sirve como guía para replicar esta infraestructura en otras aplicaciones similares (como **Facturas**).

---

## Tecnologías Usadas

| Componente | Tecnología | Versión | Imagen Docker |
|------------|------------|---------|---------------|
| **Base de Datos** | PostgreSQL | 18 | `postgres:18-alpine` |
| **Backend** | Python | 3.11 | `python:3.11-slim` |
| **Framework API** | FastAPI | 0.109.2 | - |
| **Servidor ASGI** | Uvicorn | 0.27.1 | - |
| **Frontend** | React | 19.2.3 | - |
| **Build Tool** | Vite | 7.2.4 | - |
| **Node.js** | Node.js | 22 | `node:22-alpine` |
| **Servidor Web** | Nginx | stable | `nginx:stable-alpine` |
| **TypeScript** | TypeScript | 5.9.3 | - |

### Dependencias Backend (Python)
```
fastapi==0.109.2
uvicorn[standard]==0.27.1
psycopg2-binary==2.9.9
pydantic==2.6.1
pydantic-settings==2.1.0
python-dotenv==1.0.1
requests==2.31.0
python-multipart==0.0.9
email-validator==2.1.0.post1
pdfplumber
```

### Dependencias Frontend (Node.js)
- React 19.2.3
- React Router DOM 7.11.0
- TanStack React Query 5.90.16
- TailwindCSS 4.1.18
- jsPDF 4.0.0
- XLSX 0.18.5

---

## Puertos Expuestos

| Servicio | Puerto Interno | Puerto Externo | Descripción |
|----------|----------------|----------------|-------------|
| **PostgreSQL** | 5432 | 5432 | Base de datos |
| **Backend (API)** | 8000 | 8000 | API REST FastAPI |
| **Frontend** | 80 | 5173 | Interfaz web (Nginx) |

---

## Estructura de Contenedores

```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │     db       │   │   backend    │   │   frontend   │     │
│  │  PostgreSQL  │◄──│   FastAPI    │◄──│    React     │     │
│  │  :5432       │   │    :8000     │   │    :5173     │     │
│  └──────────────┘   └──────────────┘   └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Archivos Docker

### docker-compose.yml (Raíz del proyecto)
Define los 3 servicios principales:
- **db**: Base de datos PostgreSQL
- **backend**: API FastAPI
- **frontend**: React + Nginx

### Backend/Dockerfile
- Imagen base: `python:3.11-slim`
- Puerto: 8000
- Comando: `uvicorn src.infrastructure.api.main:app`

### frontend/Dockerfile
- Multi-stage build:
  1. **Build**: `node:22-alpine` - Compila la app React
  2. **Producción**: `nginx:stable-alpine` - Sirve los archivos estáticos

### frontend/nginx.conf
- Configuración para SPA (Single Page Application)
- Compresión Gzip habilitada
- Cache de assets estáticos (1 año)

---

## Cómo Correr la Aplicación

### 1. Prerrequisitos
- Docker Desktop instalado y corriendo
- Los archivos del proyecto en su directorio

### 2. Variables de Entorno
Crear archivo `.env` en la raíz (o usar los valores por defecto):
```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=Mvtos
```

### 3. Comandos de Arranque

```powershell
# Navegar al directorio del proyecto
cd "f:\1. Cloud\4. AI\1. Antigravity\ConciliacionWeb"

# Construir y levantar contenedores
docker-compose up -d --build

# Ver logs en tiempo real
docker-compose logs -f

# Detener contenedores
docker-compose down
```

### 4. Acceso a la Aplicación
- **Frontend (Web)**: http://localhost:5173
- **Backend (API)**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

---

## Configurar Nombre Personalizado (Dominio Local)

Para acceder via `http://conciliacion.local:5173`:

### 1. Editar archivo hosts (Como Administrador)
```powershell
notepad C:\Windows\System32\drivers\etc\hosts
```

### 2. Agregar línea
```
127.0.0.1   conciliacion.local
```

### 3. Acceder
- http://conciliacion.local:5173

---

## Replicar para App "Facturas"

Para crear una aplicación similar llamada **Facturas**, realizar los siguientes cambios:

### 1. Estructura de Directorios
```
FacturasWeb/
├── Backend/
│   ├── Dockerfile          (copiar de ConciliacionWeb)
│   ├── requirements.txt    (copiar de ConciliacionWeb)
│   └── src/
├── frontend/
│   ├── Dockerfile          (copiar de ConciliacionWeb)
│   ├── nginx.conf          (copiar de ConciliacionWeb)
│   ├── package.json        (copiar de ConciliacionWeb)
│   └── src/
├── docker-compose.yml
└── .env
```

### 2. Cambios en docker-compose.yml

```yaml
services:
  db:
    image: postgres:18-alpine
    container_name: facturas_db          # ← Cambiar nombre
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-Facturas}  # ← Cambiar BD
    volumes:
      - facturas_postgres_data:/var/lib/postgresql/data  # ← Cambiar volumen
    ports:
      - "5434:5432"                       # ← Cambiar puerto externo

  backend:
    build:
      context: ./Backend
    container_name: facturas_backend     # ← Cambiar nombre
    environment:
      - DB_HOST=host.docker.internal
      - DB_PORT=5434                     # ← Ajustar puerto
      - DB_NAME=${DB_NAME:-Facturas}     # ← Cambiar BD
      - DB_USER=${DB_USER:-postgres}
      - DB_PASSWORD=SLB
      - ENVIRONMENT=production
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8001:8000"                       # ← Cambiar puerto externo

  frontend:
    build:
      context: ./frontend
    container_name: facturas_frontend    # ← Cambiar nombre
    ports:
      - "5174:80"                         # ← Cambiar puerto externo
    depends_on:
      - backend

volumes:
  facturas_postgres_data:                # ← Cambiar nombre volumen
```

### 3. Cambios en .env
```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=Facturas
```

### 4. Archivo hosts (opcional)
```
127.0.0.1   facturas.local
```

### 5. Resumen de Puertos para Facturas

| Servicio | Puerto ConciliacionWeb | Puerto Facturas |
|----------|------------------------|-----------------|
| PostgreSQL | 5432 | 5434 |
| Backend | 8000 | 8001 |
| Frontend | 5173 | 5174 |

### 6. Acceso a Facturas
- **Frontend**: http://localhost:5174 o http://facturas.local:5174
- **Backend**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

---

## Comandos Útiles

```powershell
# Ver contenedores corriendo
docker ps

# Ver logs de un servicio específico
docker-compose logs -f backend

# Reiniciar un servicio
docker-compose restart backend

# Reconstruir solo un servicio
docker-compose up -d --build backend

# Limpiar todo (incluye volúmenes)
docker-compose down -v

# Ver uso de recursos
docker stats
```

---

## Notas Importantes

1. **Volúmenes persistentes**: Los datos de PostgreSQL se guardan en volúmenes Docker, no se pierden al reiniciar.

2. **Puerto DB conflicto**: Si se ejecutan ambas apps (Conciliacion + Facturas), usar puertos diferentes para cada base de datos.

3. **Host Docker**: El backend usa `host.docker.internal` para conectar a la BD local del host (fuera del contenedor Docker).

4. **Healthcheck**: El servicio de base de datos tiene un healthcheck que asegura que PostgreSQL esté listo antes de iniciar el backend.
