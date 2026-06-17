# User Management Microservices

Sistema de gestión de usuarios basado en microservicios — Prueba técnica Senior Full-Stack Engineer (AI).

## Arquitectura General

Sistema distribuido con 5 microservicios, frontend SPA, comunicación REST síncrona, eventos asíncronos RabbitMQ, estrategia multi-DB y pipeline RAG con IA.

```mermaid
graph TB
    subgraph Frontend
        FE[React SPA<br/>Puerto 80]
    end

    subgraph Microservices
        AUTH[Auth Service<br/>Puerto 3001]
        USER[User Service<br/>Puerto 3002]
        ROLE[Role Service<br/>Puerto 3003]
        AUDIT[Audit Service<br/>Puerto 3004]
        AI[AI Service<br/>Puerto 3005]
    end

    subgraph Data Layer
        PG[(PostgreSQL<br/>5432)]
        MONGO[(MongoDB<br/>27017)]
        REDIS[(Redis<br/>6379)]
        QDRANT[(Qdrant<br/>6333)]
    end

    subgraph Messaging
        RMQ[RabbitMQ<br/>5672]
    end

    subgraph External
        LLM[OpenAI LLM]
    end

    FE -->|REST| AUTH
    FE -->|REST| USER
    FE -->|REST| ROLE
    FE -->|REST| AUDIT
    FE -->|REST| AI

    AUTH -->|REST sync| ROLE
    USER -->|REST sync| AUTH
    ROLE -->|REST sync| USER
    AI -->|REST sync| USER
    AI -->|REST sync| ROLE

    AUTH --> PG
    USER --> PG
    ROLE --> PG
    USER --> REDIS
    ROLE --> REDIS
    AUDIT --> MONGO
    AI --> QDRANT
    AI -->|Embeddings/Chat| LLM

    AUTH -->|publish| RMQ
    USER -->|publish| RMQ
    ROLE -->|publish| RMQ
    AI -->|publish| RMQ
    RMQ -->|consume| AUDIT
```

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Backend | Node.js + NestJS (TypeScript) |
| ORM | TypeORM |
| RDBMS | PostgreSQL 16 |
| Documentos | MongoDB 7 |
| Caché | Redis 7 |
| Message Broker | RabbitMQ 3 |
| Vector DB | Qdrant |
| AI Framework | LangChain.js + OpenAI |
| Frontend | React 18 + TypeScript + Vite + Zustand |
| Containerización | Docker Compose |

## Prerrequisitos

- Docker y Docker Compose
- Node.js >= 18 (para desarrollo local)
- npm >= 9
- API Key de OpenAI (para AI Service)
- Puertos disponibles: 80, 3001-3005, 5432, 5672, 6333, 6379, 15672, 27017

## Variables de Entorno

Copiar `.env.example` como `.env` y ajustar valores:

```env
# PostgreSQL
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=user_management

# MongoDB
MONGO_USER=admin
MONGO_PASSWORD=admin123
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/audit?authSource=admin

# RabbitMQ
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Redis
REDIS_URL=redis://redis:6379

# Qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=system_knowledge

# JWT
JWT_SECRET=local-development-secret-change-in-production
JWT_EXPIRATION=3600

# Service URLs (inter-service)
ROLE_SERVICE_URL=http://role-service:3003
USER_SERVICE_URL=http://user-service:3002
AUTH_SERVICE_URL=http://auth-service:3001

# OpenAI
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.3

# Admin Seed
ADMIN_USER_ID=a0000000-0000-0000-0000-000000000001
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Administrator

# Frontend (build-time)
VITE_AUTH_API_URL=http://localhost:3001
VITE_USER_API_URL=http://localhost:3002
VITE_ROLE_API_URL=http://localhost:3003
VITE_AUDIT_API_URL=http://localhost:3004
VITE_AI_API_URL=http://localhost:3005
```

## Puertos Expuestos

| Servicio | Puerto |
|---|---|
| Frontend | 80 |
| Auth Service | 3001 |
| User Service | 3002 |
| Role Service | 3003 |
| Audit Service | 3004 |
| AI Service | 3005 |
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| Redis | 6379 |
| RabbitMQ (AMQP) | 5672 |
| RabbitMQ (Management) | 15672 |
| Qdrant | 6333 |

## Levantar el Sistema

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar .env con tu OPENAI_API_KEY

# 2. Levantar todo
docker-compose up --build

# 3. Ejecutar migraciones y seed (primera vez)
npm run seed
```

## Seed Inicial

```bash
npm run seed
```

Crea: rol `admin`, usuario administrador, credenciales y asignación de rol.

**Credenciales locales:**
- Username: `admin`
- Password: `admin123`

**Login:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail": "admin", "password": "admin123"}'
```

> Las credenciales deben cambiarse en entornos no locales.

## Testing

Todos los tests usan **mocks** — no requieren infraestructura externa.

```bash
npm run test:all       # Ejecuta backend + frontend
npm run test:coverage  # Genera reportes de cobertura
```

Coverage por servicio en `services/*/coverage/` y `frontend/coverage/`.

## Estructura del Monorepo

```
├── services/
│   ├── auth-service/    (Autenticación, JWT, login)
│   ├── user-service/    (Gestión de usuarios)
│   ├── role-service/    (Gestión de roles, asignación)
│   ├── audit-service/   (Consumo de eventos, MongoDB)
│   └── ai-service/      (RAG, LLM, embeddings)
├── shared/              (Guards, logging, errores, mensajería)
├── frontend/            (React SPA)
├── scripts/             (Seed)
├── docs/                (ADRs, documentación)
├── docker-compose.yml
└── .env.example
```

## Endpoints Principales

### Auth Service (3001)
| Método | Ruta | Descripción |
|---|---|---|
| POST | /auth/login | Login, retorna JWT |
| POST | /auth/validate | Validación interna de token |
| POST | /auth/internal/credentials | Crear credenciales (interno, admin) |
| GET | /health | Health check |

### User Service (3002)
| Método | Ruta | Descripción |
|---|---|---|
| POST | /users | Crear usuario (admin) |
| GET | /users | Listar usuarios |
| GET | /users/:id | Obtener usuario |
| PUT | /users/:id | Actualizar usuario (admin) |
| DELETE | /users/:id | Eliminar usuario (admin) |
| GET | /users/context | Datos para AI (interno) |
| GET | /health | Health check |

### Role Service (3003)
| Método | Ruta | Descripción |
|---|---|---|
| POST | /roles | Crear rol (admin) |
| GET | /roles | Listar roles |
| GET | /roles/:id | Obtener rol |
| DELETE | /roles/:id | Eliminar rol (admin) |
| POST | /roles/assign | Asignar rol (admin) |
| POST | /roles/unassign | Desasignar rol (admin) |
| GET | /roles/user/:userId | Roles de usuario (interno) |
| GET | /health | Health check |

### Audit Service (3004)
| Método | Ruta | Descripción |
|---|---|---|
| GET | /audit/events | Consultar eventos (admin) |
| GET | /health | Health check |

### AI Service (3005)
| Método | Ruta | Descripción |
|---|---|---|
| POST | /ai/query | Consulta RAG (JWT) |
| POST | /ai/index | Indexar sistema (admin, interno) |
| GET | /health | Health check |

## Comunicación entre Servicios

### REST Síncrono
- **Auth → Role**: Resolver roles del usuario durante login
- **User → Auth**: Crear credenciales al crear usuario
- **Role → User**: Validar existencia de usuario al asignar rol
- **AI → User/Role**: Obtener datos para indexación RAG

### RabbitMQ Asíncrono (Auditoría)

Exchange: `audit.events` (topic, durable)

| Servicio | Routing Keys |
|---|---|
| Auth | `audit.auth.login` |
| User | `audit.user.created`, `audit.user.updated`, `audit.user.deleted` |
| Role | `audit.role.created`, `audit.role.deleted`, `audit.role.assigned`, `audit.role.unassigned` |
| AI | `audit.ai.query`, `audit.ai.indexed` |

Colas del Audit Service:
- `audit.auth.queue` (pattern: `audit.auth.*`)
- `audit.user.queue` (pattern: `audit.user.*`)
- `audit.role.queue` (pattern: `audit.role.*`)
- `audit.ai.queue` (pattern: `audit.ai.*`)

## Flujo de Identidad

1. Admin crea usuario → `POST /users` (User Service)
2. User Service crea credenciales → `POST /auth/internal/credentials` (Auth Service)
3. Admin asigna rol → `POST /roles/assign` (Role Service)
4. Usuario hace login → `POST /auth/login` (Auth Service)
5. Auth Service resuelve roles → `GET /roles/user/:id` (Role Service)
6. JWT emitido con `{sub, username, roles}`

## DDD y Clean Architecture

Cada microservicio se organiza en 4 capas:

```
service/src/
├── domain/          # Núcleo: entidades, value objects, interfaces de repositorio
├── application/     # Casos de uso, orquestación
├── infrastructure/  # TypeORM, Mongoose, Redis, HTTP clients, RabbitMQ
└── presentation/    # Controllers, DTOs, Guards
```

**Regla de dependencia:** Las capas externas dependen de las internas. El dominio no conoce la infraestructura. La inversión de dependencias se logra mediante interfaces en el dominio e inyección desde infraestructura.

## Seguridad

- JWT con HS256, expiración configurable
- Roles incluidos en token payload
- Guards compartidos (JwtAuthGuard + RoleGuard)
- Helmet para headers de seguridad
- Rate limiting en login (5 intentos/min/IP)
- Passwords con bcrypt (12 rounds)
- Token en memoria en frontend (no localStorage)
- Exception filter global: nunca expone stack traces
- Validación y sanitización de entradas (class-validator)

## Limitaciones Conocidas

- No hay refresh token
- No hay token blacklist
- No hay OAuth externo
- No hay DLQ ni retry avanzado
- No hay circuit breaker
- No hay API Gateway/reverse proxy (frontend consume servicios directamente)
- Correlation ID se propaga en eventos; propagación REST outbound es mejora futura
- Costo de IA es estimado, no facturación exacta
- No hay paginación avanzada
- No hay filtros avanzados de auditoría
