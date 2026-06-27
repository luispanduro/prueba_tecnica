# Sistema de Gestión de Usuarios con Microservicios e IA

Plataforma de gestión de usuarios con control de acceso basado en roles (RBAC), auditoría de operaciones y un agente de inteligencia artificial con capacidad RAG. Construida sobre seis microservicios independientes, una SPA React y toda la infraestructura auxiliar orquestada por Docker Compose.

---

## Tabla de contenidos

- [Arquitectura general](#arquitectura-general)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Microservicios](#microservicios)
- [Infraestructura](#infraestructura)
- [Requisitos previos](#requisitos-previos)
- [Configuración inicial](#configuración-inicial)
- [Levantar el sistema](#levantar-el-sistema)
- [Acceso a servicios](#acceso-a-servicios)
- [API principal — flujos E2E](#api-principal--flujos-e2e)
- [Roles y permisos](#roles-y-permisos)
- [Agente de IA (RAG)](#agente-de-ia-rag)
- [Autenticación y seguridad](#autenticación-y-seguridad)
- [Observabilidad](#observabilidad)
- [Tests](#tests)
- [Frontend en modo desarrollo](#frontend-en-modo-desarrollo)
- [Documentación adicional](#documentación-adicional)

---

## Arquitectura general

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                    Docker Network                        │
  ┌──────────┐          │  ┌──────────┐    ┌──────────────────────────────────┐   │
  │ Browser  │──HTTP────┼──│ Frontend │    │              BFF :3000           │   │
  └──────────┘    :80   │  │  (Nginx) │────│  JWT Guard + Rate Limit + Proxy  │   │
                        │  └──────────┘    └────┬─────┬──────┬──────┬─────┬───┘   │
                        │                       │     │      │      │     │        │
                        │              ┌────────┘  ┌──┘   ┌──┘  ┌──┘  ┌──┘       │
                        │              ▼           ▼      ▼     ▼     ▼           │
                        │         auth      user    role  audit  ai               │
                        │         :3001     :3002   :3003  :3005  :3004            │
                        │           │         │       │      │      │              │
                        │           └────┬────┘       │      │      │              │
                        │                │            │      │      │              │
                        │           RabbitMQ ◄────────┴──────┘      │              │
                        │                │                           │              │
                        │     ┌──────────▼──────────────────────┐   │              │
                        │     │  PostgreSQL  │  MongoDB  │ Redis │   │              │
                        │     └─────────────────────────────────┘   │              │
                        │                                        Qdrant            │
                        └─────────────────────────────────────────────────────────┘
```

### Principios arquitectónicos

| Principio | Aplicación |
|---|---|
| **Autonomía** | Cada microservicio tiene su propia BD, Dockerfile y ciclo de vida. Ninguno importa código de otro. |
| **DDD** | Entidades, value objects, servicios de dominio y repositorios por interfaz en cada servicio. |
| **Clean Architecture** | Dependencias siempre apuntan hacia el dominio. La infraestructura implementa interfaces de dominio. |
| **CQRS** | Auth, User y Role Service separan comandos (escritura) de queries (lectura) con buses dedicados. |
| **Seguridad por diseño** | Ningún endpoint público salvo autenticación. JWT validado localmente en cada servicio. |
| **Observabilidad** | Todo evento relevante produce un log JSON estructurado con correlation ID. |

---

## Stack tecnológico

### Backend
| Componente | Tecnología | Versión |
|---|---|---|
| Framework | NestJS + TypeScript | 10.x / 5.x |
| ORM (SQL) | TypeORM | ^1.0 |
| ODM (NoSQL) | Mongoose | ^8 |
| CQRS | @nestjs/cqrs | ^11 |
| Autenticación | Passport JWT | ^4 |
| Mensajería | amqp-connection-manager | ^5 |
| Circuit Breaker | opossum | ^8 |
| Logging | winston + nest-winston | ^3 |

### Bases de datos e infraestructura
| Rol | Tecnología | Imagen Docker |
|---|---|---|
| BD relacional | PostgreSQL | postgres:16-alpine |
| BD documental | MongoDB | mongo:7 |
| Cache / tokens | Redis | redis:7-alpine |
| Mensajería | RabbitMQ | rabbitmq:3-management-alpine |
| Vector DB | Qdrant | qdrant/qdrant:latest |

### AI
| Componente | Tecnología |
|---|---|
| LLM | OpenAI GPT-4o-mini |
| Embeddings | text-embedding-3-small (1536 dim) |
| Framework RAG | LangChain.js v0.3 |
| Vector store | Qdrant |

### Frontend
| Componente | Tecnología |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Estado global | Redux Toolkit + RTK Query |
| Formularios | react-hook-form + Zod |
| Routing | React Router v6 |
| Notificaciones | react-hot-toast |

---

## Estructura del monorepo

```
toka-user-mgmt/
├── services/
│   ├── auth-service/        # Autenticación y gestión de credenciales   :3001
│   ├── user-service/        # Gestión de perfiles de usuario             :3002
│   ├── role-service/        # Roles, permisos y RBAC                     :3003
│   ├── ai-service/          # Agente IA con pipeline RAG                 :3004
│   ├── audit-service/       # Auditoría de eventos del sistema           :3005
│   └── bff/                 # Backend For Frontend (API Gateway)         :3000
├── frontend/                # SPA React (servida por Nginx en :80)
├── scripts/
│   └── create-multiple-dbs.sh   # Inicialización multi-DB de PostgreSQL
├── docs/
│   ├── architecture-decisions.md  # DDD, Clean Architecture, CQRS
│   ├── runbook.md                 # Guía operacional completa
│   └── incident-response.md      # Plan de diagnóstico operacional
├── docker-compose.yml
└── .env.example
```

Cada microservicio sigue la misma estructura de capas interna:

```
src/
├── domain/           # Entidades, VOs, eventos, interfaces de repositorio
├── application/      # Commands, Queries, Handlers (CQRS)
└── infrastructure/   # TypeORM/Mongoose, RabbitMQ, HTTP controllers, guards
```

---

## Microservicios

### Auth Service `:3001`
Gestiona credenciales (email + bcrypt hash). Emite y valida tokens JWT. Usa Redis para refresh tokens y blacklist de access tokens.

**Endpoints**:
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/auth/register` | Registrar nuevo usuario | No |
| POST | `/auth/login` | Iniciar sesión | No |
| POST | `/auth/logout` | Cerrar sesión (revoca tokens) | JWT |
| POST | `/auth/refresh` | Renovar access token | No |
| GET | `/auth/validate` | Validar token activo | JWT |
| GET | `/health` | Estado del servicio | No |

**Domain Events publicados**: `auth.user.registered`, `auth.user.login.success`, `auth.user.login.failed`, `auth.user.logout`

---

### User Service `:3002`
Gestiona perfiles de usuarios (nombre, email, estado) y asignación de roles. Verifica la existencia de roles vía Role Service con circuit breaker.

**Endpoints**:
| Método | Ruta | Descripción | Permiso |
|---|---|---|---|
| GET | `/users` | Listar usuarios (paginado) | `users:read` |
| GET | `/users/:id` | Obtener usuario | `users:read` |
| POST | `/users` | Crear usuario | `users:write` |
| PUT | `/users/:id` | Actualizar usuario | `users:write` |
| DELETE | `/users/:id` | Eliminar usuario | `users:delete` |
| POST | `/users/:id/roles` | Asignar rol | `users:write` |
| DELETE | `/users/:id/roles/:roleId` | Quitar rol | `users:write` |
| GET | `/users/:id/roles` | Ver roles del usuario | `users:read` |
| GET | `/health` | Estado del servicio | No |

**Domain Events publicados**: `users.user.created`, `users.user.updated`, `users.user.deleted`, `users.user.role.assigned`, `users.user.role.removed`

---

### Role Service `:3003`
Fuente de verdad de roles y permisos. Define los 4 roles del sistema y permite gestionar roles personalizados.

**Endpoints**:
| Método | Ruta | Descripción | Permiso |
|---|---|---|---|
| GET | `/roles` | Listar todos los roles | `roles:read` |
| GET | `/roles/:id` | Obtener rol | `roles:read` |
| POST | `/roles` | Crear rol | `roles:write` |
| PUT | `/roles/:id` | Actualizar rol | `roles:write` |
| DELETE | `/roles/:id` | Eliminar rol | `roles:delete` |
| POST | `/roles/:id/permissions` | Agregar permiso | `roles:write` |
| DELETE | `/roles/:id/permissions/:perm` | Quitar permiso | `roles:write` |
| GET | `/health` | Estado del servicio | No |

**Domain Events publicados**: `roles.role.created`, `roles.role.updated`, `roles.role.deleted`

---

### AI Service `:3004`
Agente de IA con pipeline RAG. Indexa documentos de conocimiento del sistema en Qdrant y responde preguntas usando GPT-4o-mini con contexto recuperado.

**Endpoints**:
| Método | Ruta | Descripción | Permiso |
|---|---|---|---|
| POST | `/ai/query` | Consultar al agente IA | JWT |
| POST | `/ai/index` | Forzar re-indexación | `ai:admin` |
| GET | `/ai/metrics` | Últimas 100 métricas de consulta | JWT |
| GET | `/ai/metrics/:queryId` | Métrica de consulta específica | JWT |
| GET | `/ai/health` | Estado (incluye Qdrant y OpenAI) | No |

**Pipeline RAG**: embedding de consulta → búsqueda en Qdrant (top-5, score ≥ 0.7) → construcción de prompt → GPT-4o-mini → respuesta con fuentes y métricas.

---

### Audit Service `:3005`
Consume todos los eventos del sistema desde RabbitMQ y los persiste en MongoDB. Garantiza idempotencia con índice único en `eventId`.

**Endpoints**:
| Método | Ruta | Descripción | Permiso |
|---|---|---|---|
| GET | `/audit/logs` | Listar logs (filtros: fecha, userId, tipo) | `audit:read` |
| GET | `/audit/logs/:id` | Obtener log específico | `audit:read` |
| GET | `/audit/logs/user/:userId` | Logs de un usuario | `audit:read` |
| GET | `/audit/logs/stats` | Estadísticas últimos 7 días | `audit:read` |
| GET | `/health` | Estado del servicio | No |

**Mapeo de eventos**: audita 12 tipos de eventos de auth, user y role services.

---

### BFF `:3000`
API Gateway que actúa como único punto de entrada para el frontend. Valida JWT, aplica rate limiting y proxy hacia los microservicios.

**Seguridad aplicada en BFF**:
- Helmet (headers de seguridad HTTP)
- CORS restringido a `http://localhost`
- Rate limiting global: 100 req/min por IP
- Rate limiting en `/api/auth/login`: 10 req/min
- `X-Correlation-Id` en todas las respuestas

**Prefijos de proxy**:

| Ruta BFF | Microservicio destino |
|---|---|
| `/api/auth/*` | auth-service:3001 |
| `/api/users/*` | user-service:3002 |
| `/api/roles/*` | role-service:3003 |
| `/api/audit/*` | audit-service:3005 |
| `/api/ai/*` | ai-service:3004 (timeout 35s) |

---

## Infraestructura

### Redes Docker
| Red | Servicios conectados |
|---|---|
| `frontend-net` | frontend, bff |
| `backend-net` | bff, auth, user, role, audit, ai, rabbitmq |
| `data-net` | auth, user, role, audit, ai, postgres, mongodb, redis, qdrant |

### Volúmenes persistentes
`postgres-data`, `mongodb-data`, `redis-data`, `rabbitmq-data`, `qdrant-data`

### Bases de datos
| BD | Motor | Usada por |
|---|---|---|
| `auth_db` | PostgreSQL | auth-service |
| `users_db` | PostgreSQL | user-service |
| `roles_db` | PostgreSQL | role-service |
| `audit_db` | MongoDB | audit-service |
| `system_knowledge` | Qdrant (vectores) | ai-service |

### Mensajería
- **Exchange**: `toka.events` (topic, durable)
- **Queue**: `audit.events.queue` (durable, prefetch 10)
- **Binding**: routing key `#` (todos los eventos)
- **Dead-letter**: exchange `toka.dlx` → queue `audit.dlq` (tras 3 reintentos fallidos)

---

## Requisitos previos

| Herramienta | Versión mínima | Verificación |
|---|---|---|
| Docker | ≥ 24 | `docker --version` |
| Docker Compose | ≥ 2.20 | `docker compose version` |
| Node.js | 20 LTS | `node --version` (solo para desarrollo local) |
| OpenAI API Key | — | Obtener en https://platform.openai.com |

> **Windows**: asegurarse de que Docker Desktop esté corriendo antes de ejecutar cualquier comando.

---

## Configuración inicial

```bash
# 1. Copiar el archivo de variables de entorno
cp .env.example .env

# 2. Editar .env con valores reales — mínimo obligatorio:
#   POSTGRES_PASSWORD=<contraseña-segura>
#   MONGO_PASSWORD=<contraseña-segura>
#   REDIS_PASSWORD=<contraseña-segura>
#   RABBITMQ_PASSWORD=<contraseña-segura>
#   JWT_SECRET=<string-aleatorio-min-32-chars>
#   OPENAI_API_KEY=sk-<tu-api-key>
#   SEED_ADMIN_EMAIL=admin@tudominio.com
#   SEED_ADMIN_PASSWORD=<contraseña-admin>
```

Variables de entorno completas (ver `.env.example`):

```bash
# PostgreSQL
POSTGRES_USER=toka_user
POSTGRES_PASSWORD=change_me_in_prod
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# MongoDB
MONGO_USER=toka_mongo
MONGO_PASSWORD=change_me_in_prod

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=change_me_in_prod

# RabbitMQ
RABBITMQ_USER=toka_rmq
RABBITMQ_PASSWORD=change_me_in_prod

# JWT
JWT_SECRET=minimum_256_bit_random_string_replace_this
JWT_EXPIRES_IN=900           # 15 minutos
REFRESH_TOKEN_TTL=604800     # 7 días

# OpenAI
OPENAI_API_KEY=sk-replace-with-real-key

# Qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=system_knowledge

# Seeds
SEED_ADMIN_EMAIL=admin@toka.com
SEED_ADMIN_PASSWORD=Admin1234!

# Log level
LOG_LEVEL=info
```

---

## Levantar el sistema

```bash
# Construir imágenes y levantar todos los servicios
docker compose up --build

# En segundo plano (recomendado para uso continuado)
docker compose up --build -d

# Verificar que todos los servicios están saludables
docker compose ps
```

Estado esperado (el primer arranque tarda 3–5 minutos):

| Contenedor | Puerto host | Estado |
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

Al iniciar, el sistema ejecuta automáticamente:
- Creación de las BDs `auth_db`, `users_db`, `roles_db` en PostgreSQL
- Seed de 4 roles del sistema: `SUPER_ADMIN`, `ADMIN`, `USER`, `AUDITOR`
- Seed del usuario administrador con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- Indexación de documentos de conocimiento en Qdrant (solo en el primer arranque)

---

## Acceso a servicios

| Servicio | URL | Credenciales |
|---|---|---|
| **Frontend SPA** | http://localhost | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` |
| **BFF API** | http://localhost:3000 | JWT Bearer token |
| **RabbitMQ Management** | http://localhost:15672 | `RABBITMQ_USER` / `RABBITMQ_PASSWORD` |
| **Qdrant Dashboard** | http://localhost:6333/dashboard | Sin autenticación |

### Health checks rápidos

```bash
curl -s http://localhost:3000/health | jq .   # BFF
curl -s http://localhost:3001/health | jq .   # auth-service
curl -s http://localhost:3002/health | jq .   # user-service
curl -s http://localhost:3003/health | jq .   # role-service
curl -s http://localhost:3004/health | jq .   # ai-service
curl -s http://localhost:3005/health | jq .   # audit-service
```

---

## API principal — flujos E2E

### Flujo 1 — Registro y Login

```bash
# 1. Registrar usuario
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"Pass1234!"}'
# → HTTP 201: {"userId":"...","email":"..."}

# 2. Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@toka.com","password":"Admin1234!"}'
# → HTTP 200: {"accessToken":"...","refreshToken":"...","expiresIn":900}

# 3. Guardar el token
export TOKEN="<accessToken de la respuesta anterior>"
```

### Flujo 2 — CRUD de usuarios

```bash
# Obtener ID del rol USER
ROLE_ID=$(curl -s http://localhost:3003/internal/roles | jq -r '.[] | select(.name=="USER") | .id')

# Crear usuario
curl -X POST http://localhost/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"john@test.com\",\"roleIds\":[\"$ROLE_ID\"]}"
# → HTTP 201: "<uuid-del-usuario>"

# Listar usuarios (paginado)
curl "http://localhost/api/users?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
# → HTTP 200: {"items":[...],"total":N,"page":1,"limit":10}

# Actualizar usuario
curl -X PUT "http://localhost/api/users/<USER_ID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jane","lastName":"Smith","email":"jane@test.com"}'
# → HTTP 200
```

### Flujo 3 — Auditoría

```bash
# Ver todos los logs de auditoría
curl "http://localhost/api/audit/logs?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Filtrar por usuario
curl "http://localhost/api/audit/logs?userId=<USER_ID>" \
  -H "Authorization: Bearer $TOKEN"

# Estadísticas por tipo de evento (últimos 7 días)
curl "http://localhost/api/audit/logs/stats" \
  -H "Authorization: Bearer $TOKEN"
```

### Flujo 4 — Agente IA

```bash
# Consultar al agente IA
curl -X POST http://localhost/api/ai/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"¿Qué permisos tiene el rol ADMIN?"}'
# → HTTP 200: {"queryId":"...","answer":"...","sources":[...],"metrics":{...}}

# Ver métricas de consultas anteriores
curl "http://localhost/api/ai/metrics" \
  -H "Authorization: Bearer $TOKEN"
```

### Gestión de roles

```bash
# Crear un rol personalizado
curl -X POST http://localhost/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"REPORTES","description":"Acceso a reportes","isSystem":false}'

# Asignar permiso a un rol
curl -X POST "http://localhost/api/roles/<ROLE_ID>/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission":"audit:read"}'

# Asignar rol a usuario
curl -X POST "http://localhost/api/users/<USER_ID>/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleId":"<ROLE_ID>"}'
```

---

## Roles y permisos

### Roles del sistema (no eliminables)

| Rol | Permisos |
|---|---|
| `SUPER_ADMIN` | `users:read`, `users:write`, `users:delete`, `roles:read`, `roles:write`, `roles:delete`, `audit:read`, `ai:admin` |
| `ADMIN` | `users:read`, `users:write`, `users:delete`, `roles:read`, `audit:read` |
| `USER` | `users:read` |
| `AUDITOR` | `audit:read`, `users:read` |

### Permisos disponibles

| Permiso | Descripción |
|---|---|
| `users:read` | Ver usuarios y sus datos |
| `users:write` | Crear y editar usuarios |
| `users:delete` | Eliminar usuarios |
| `roles:read` | Ver roles y permisos |
| `roles:write` | Crear y editar roles |
| `roles:delete` | Eliminar roles personalizados |
| `audit:read` | Ver logs de auditoría |
| `ai:admin` | Re-indexar documentos en el AI Service |

Los permisos se incluyen en el payload del JWT en cada login y se validan localmente en cada microservicio mediante `PermissionsGuard`.

---

## Agente de IA (RAG)

### Pipeline de consulta

```
Pregunta del usuario
      │
      ▼
Embedding (text-embedding-3-small)
      │
      ▼
Búsqueda semántica en Qdrant (top-5, score ≥ 0.7)
      │
      ▼
Construcción de prompt (SYSTEM_PROMPT + contexto + pregunta)
      │
      ▼
GPT-4o-mini (maxTokens: 800, temperature: 0.3)
      │
      ▼
Respuesta + fuentes + métricas (latencia, tokens, costo estimado)
```

### Documentos de conocimiento indexados

Los documentos están en `services/ai-service/src/docs/`:
- `user-management-guide.md` — Gestión de usuarios, roles y estados
- `roles-permissions-reference.md` — Referencia completa de roles y permisos
- `system-overview.md` — Visión general del sistema y preguntas frecuentes

### Estructura de respuesta del agente

```json
{
  "queryId": "uuid",
  "answer": "texto de la respuesta",
  "sources": [
    { "content": "fragmento relevante", "source": "archivo.md", "score": 0.89 }
  ],
  "metrics": {
    "embeddingLatencyMs": 120,
    "retrievalLatencyMs": 45,
    "llmLatencyMs": 890,
    "totalLatencyMs": 1055,
    "inputTokens": 512,
    "outputTokens": 180,
    "estimatedCostUSD": 0.000185,
    "chunksRetrieved": 5,
    "avgChunkScore": 0.82,
    "qualityFlags": []
  }
}
```

---

## Autenticación y seguridad

### Flujo JWT

```
Login → accessToken (15 min, JWT firmado) + refreshToken (7 días, almacenado en Redis)
      ↓
Cada request → BFF verifica JWT localmente → forward con Authorization header
      ↓
Microservicio → verifica JWT localmente → extrae userId, email, roles, permissions
```

### Tokens en Redis

| Key | TTL | Uso |
|---|---|---|
| `refresh_token:{userId}:{tokenId}` | 7 días | Refresh token válido |
| `token_blacklist:{jti}` | 15 min | Access token revocado (logout) |
| `permissions_cache:{userId}` | configurable | Cache de permisos |

### Validación de contraseñas

Requisitos en registro:
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos un número

Almacenamiento: bcrypt con cost factor 12 (nunca texto plano).

### Headers de seguridad (BFF)

- `helmet()` — headers de seguridad HTTP estándar
- `X-Correlation-Id` — trazabilidad de requests
- `X-User-Id`, `X-User-Roles` — propagados a microservicios backend

---

## Observabilidad

### Formato de log (JSON estructurado)

Todos los servicios emiten logs JSON por línea con este esquema:

```json
{
  "timestamp": "2026-06-27T03:24:55.097Z",
  "level": "info",
  "service": "auth-service",
  "correlationId": "uuid",
  "action": "request.completed",
  "userId": "uuid | null",
  "duration": 12,
  "metadata": {}
}
```

### Ver logs en tiempo real

```bash
# Un servicio específico
docker compose logs -f auth-service

# Múltiples servicios
docker compose logs -f auth-service user-service bff

# Solo errores del BFF
docker compose logs bff | grep '"level":"error"'

# Trazar una request por correlationId
docker compose logs | grep "mi-correlation-id"
```

### Actions de log más relevantes

| Action | Servicio | Descripción |
|---|---|---|
| `request.received` / `request.completed` | Todos | Inicio y fin de cada HTTP request con duración |
| `event.published` | Auth, User, Role | Evento publicado a RabbitMQ |
| `event.consume.success` | Audit | Evento procesado y persistido |
| `seed.admin.created` | Auth | Usuario admin creado en bootstrap |
| `seed.roles.completed` | Role | Roles del sistema creados |
| `indexing.completed` | AI | Documentos indexados en Qdrant |
| `circuit_breaker.opened` | User | Role Service no disponible |

---

## Tests

### Ejecutar tests por servicio

```bash
# Con reporte de coverage
cd services/auth-service  && npm run test:cov
cd services/user-service  && npm run test:cov
cd services/role-service  && npm run test:cov
cd services/audit-service && npm run test:cov
cd services/ai-service    && npm run test:cov

# Frontend
cd frontend && npm run test
```

### Umbrales de coverage configurados

| Servicio | Lines | Functions | Branches |
|---|---|---|---|
| auth-service | ≥ 70% | ≥ 70% | ≥ 65% |
| user-service | ≥ 70% | ≥ 70% | ≥ 65% |
| role-service | ≥ 70% | ≥ 70% | ≥ 65% |
| audit-service | ≥ 70% | ≥ 70% | ≥ 65% |
| ai-service | ≥ 70% | ≥ 70% | ≥ 65% |
| frontend | ≥ 60% | — | — |

Los reportes HTML se generan en `services/<nombre>/coverage/lcov-report/index.html`.

---

## Frontend en modo desarrollo

Útil para iterar en el frontend con hot-reload manteniendo los microservicios en Docker.

```bash
# 1. Levantar solo infraestructura y microservicios
docker compose up -d postgres mongodb redis rabbitmq qdrant \
  role-service auth-service user-service audit-service ai-service bff

# 2. Iniciar frontend en modo dev
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Las llamadas a `/api/*` se proxían automáticamente al BFF en `http://localhost:3000` según la configuración en `vite.config.ts`.

---

## Comandos de operación útiles

```bash
# Reconstruir un servicio específico
docker compose up --build auth-service

# Reiniciar un servicio sin reconstruir
docker compose restart user-service

# Detener el sistema (preserva datos)
docker compose down

# Detener y eliminar todos los datos (volúmenes)
docker compose down -v

# Forzar re-indexación de documentos en el AI Service
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@toka.com","password":"Admin1234!"}' | jq -r '.accessToken')

curl -X POST http://localhost/api/ai/index \
  -H "Authorization: Bearer $TOKEN"
```

---

## Documentación adicional

| Documento | Contenido |
|---|---|
| [`docs/architecture-decisions.md`](docs/architecture-decisions.md) | Justificación de decisiones técnicas, aplicación de DDD, Clean Architecture y CQRS por servicio, flujos de datos E2E |
| [`docs/runbook.md`](docs/runbook.md) | Guía operacional completa: configuración, arranque, tests, logs, comandos de emergencia |
| [`docs/incident-response.md`](docs/incident-response.md) | Plan de diagnóstico para incidentes (hipótesis, comandos Docker, comunicación a stakeholders) |
| [`.claude/design.md`](.claude/design.md) | Diseño técnico detallado del sistema (17 secciones) |

---

## Créditos

Desarrollado como prueba técnica — **Senior Full-Stack Engineer (IA)** — Toka, 2025.

Arquitectura: microservicios con NestJS, DDD, Clean Architecture, CQRS, RAG con LangChain.js + OpenAI + Qdrant, frontend React + RTK Query, orquestación con Docker Compose.
