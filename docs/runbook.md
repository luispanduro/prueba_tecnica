# Runbook — Sistema de Gestión de Usuarios Toka

## 1. Prerrequisitos

| Herramienta | Versión mínima | Verificación |
|---|---|---|
| Docker | ≥ 24 | `docker --version` |
| Docker Compose | ≥ 2.20 | `docker compose version` |
| Node.js | 20 LTS | `node --version` |
| OpenAI API Key | — | Obtener en https://platform.openai.com |

> **Windows**: asegurarse de que Docker Desktop esté corriendo antes de ejecutar cualquier comando.

---

## 2. Configuración inicial

```bash
# Clonar/acceder al repositorio
cd toka-user-mgmt

# Copiar el archivo de variables de entorno
cp .env.example .env

# Editar .env con valores reales (mínimo obligatorio):
#   POSTGRES_PASSWORD=<contraseña-segura>
#   MONGO_PASSWORD=<contraseña-segura>
#   REDIS_PASSWORD=<contraseña-segura>
#   RABBITMQ_PASSWORD=<contraseña-segura>
#   JWT_SECRET=<string-aleatorio-min-32-chars>
#   OPENAI_API_KEY=sk-<tu-api-key>
#   SEED_ADMIN_EMAIL=admin@tudominio.com
#   SEED_ADMIN_PASSWORD=<contraseña-admin>
```

---

## 3. Levantar el sistema completo

```bash
# Construir imágenes y levantar todos los servicios
docker compose up --build

# En segundo plano (recomendado para uso continuado)
docker compose up --build -d
```

> El primer arranque puede tardar 3–5 minutos mientras se construyen las imágenes, se crean las bases de datos y se ejecutan los seeds de roles y usuario administrador.

---

## 4. Verificar que todos los servicios están saludables

```bash
# Ver estado de todos los contenedores
docker compose ps

# Esperar hasta que todos muestren estado "healthy"
# La columna STATUS debe mostrar: Up X minutes (healthy)
```

Estado esperado al arranque completo:

| Servicio | Puerto host | Estado esperado |
|---|---|---|
| toka-postgres | — | healthy |
| toka-mongodb | — | healthy |
| toka-redis | — | healthy |
| toka-rabbitmq | 5672, 15672 | healthy |
| toka-qdrant | 6333, 6334 | healthy |
| toka-role-service | 3003 | healthy |
| toka-auth-service | 3001 | healthy |
| toka-user-service | 3002 | healthy |
| toka-audit-service | 3005 | healthy |
| toka-ai-service | 3004 | healthy |
| toka-bff | 3000 | healthy |
| toka-frontend | 80 | running |

---

## 5. Acceso a servicios

| Servicio | URL | Credenciales |
|---|---|---|
| **Frontend (SPA)** | http://localhost | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` del `.env` |
| **BFF API** | http://localhost:3000 | JWT Bearer token |
| **RabbitMQ Management** | http://localhost:15672 | `RABBITMQ_USER` / `RABBITMQ_PASSWORD` del `.env` |
| **Qdrant Dashboard** | http://localhost:6333/dashboard | Sin autenticación |

### Verificación rápida de cada servicio

```bash
curl -s http://localhost:3000/health | jq .   # BFF
curl -s http://localhost:3001/health | jq .   # auth-service
curl -s http://localhost:3002/health | jq .   # user-service
curl -s http://localhost:3003/health | jq .   # role-service
curl -s http://localhost:3004/health | jq .   # ai-service
curl -s http://localhost:3005/health | jq .   # audit-service
```

---

## 6. Credenciales del administrador inicial

Al arrancar por primera vez, el sistema crea automáticamente un usuario administrador con las credenciales definidas en el `.env`:

```
Email:    valor de SEED_ADMIN_EMAIL    (ej: admin@toka.com)
Password: valor de SEED_ADMIN_PASSWORD (ej: Admin1234!)
```

Este usuario tiene el rol `SUPER_ADMIN` con acceso completo al sistema.

---

## 7. Ejecutar el frontend en modo desarrollo (sin Docker)

Útil para desarrollo local del frontend con hot-reload, manteniendo el backend en Docker.

```bash
# Paso 1: levantar solo la infraestructura y los microservicios (sin el contenedor de frontend)
docker compose up -d postgres mongodb redis rabbitmq qdrant \
  role-service auth-service user-service audit-service ai-service bff

# Paso 2: instalar dependencias e iniciar el servidor de desarrollo
cd frontend
npm install
npm run dev

# El frontend arrancará en http://localhost:5173
# Las llamadas a /api/* se proxiarán al BFF en http://localhost:3000
```

> Asegurarse de que Vite esté configurado para proxiar `/api` al BFF. Ver `vite.config.ts` → `server.proxy`.

---

## 8. Ejecutar tests de un microservicio

```bash
# Tests con reporte de coverage (ejemplo: auth-service)
cd services/auth-service
npm run test:cov

# Tests de otros servicios
cd services/user-service  && npm run test:cov
cd services/role-service  && npm run test:cov
cd services/audit-service && npm run test:cov
cd services/ai-service    && npm run test:cov

# Tests del frontend
cd frontend
npm run test
```

---

## 9. Ver logs de un servicio

```bash
# Seguir logs en tiempo real de un servicio específico
docker compose logs -f auth-service

# Ver las últimas N líneas
docker compose logs --tail 100 user-service

# Ver logs de múltiples servicios simultáneamente
docker compose logs -f auth-service user-service bff

# Filtrar errores en los logs del BFF
docker compose logs bff | grep '"level":"error"'

# Rastrear una request por correlationId
docker compose logs | grep "abc-123-def"
```

---

## 10. Apagar el sistema

```bash
# Detener todos los contenedores (preserva volúmenes y datos)
docker compose down

# Detener y eliminar también los volúmenes (borra TODOS los datos)
docker compose down -v

# Detener un servicio específico sin afectar los demás
docker compose stop auth-service

# Reiniciar un servicio específico
docker compose restart user-service
```

---

## Comandos de operación adicionales

### Reconstruir un servicio específico

```bash
docker compose up --build auth-service
```

### Re-indexar documentos en el AI Service

```bash
# Requiere token de admin con permiso ai:admin
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SEED_ADMIN_EMAIL\",\"password\":\"$SEED_ADMIN_PASSWORD\"}" \
  | jq -r '.accessToken')

curl -X POST http://localhost/api/ai/index \
  -H "Authorization: Bearer $TOKEN"
```

### Consultar el agente de IA

```bash
curl -X POST http://localhost/api/ai/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Qué permisos tiene el rol ADMIN?"}'
```

### Ver métricas del AI Service

```bash
curl -s http://localhost/api/ai/metrics \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:5]'
```
