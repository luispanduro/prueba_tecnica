# Documento de Diseño

## Overview

Este documento describe el diseño técnico de un sistema de gestión de usuarios basado en microservicios. La solución comprende cinco microservicios principales (Auth, User, Role, Audit, AI/RAG), un frontend SPA, infraestructura de mensajería y múltiples bases de datos, todo ejecutable localmente mediante Docker Compose.

### Decisiones Tecnológicas Principales

| Componente | Elección | Justificación |
|---|---|---|
| Backend | **Node.js + NestJS** (TypeScript) | Ecosistema unificado con el frontend, excelente soporte DDD/Clean Architecture vía módulos NestJS, inyección de dependencias nativa, decoradores para validación |
| ORM | **TypeORM** | Compatible con múltiples RDBMS, soporta migraciones, repositories pattern alineado con DDD |
| RDBMS | **PostgreSQL** | Open source, robusto, excelente rendimiento, amplio ecosistema Docker |
| Documentos | **MongoDB** | Flexible para eventos de auditoría con esquemas variables |
| Caché | **Redis** | Estándar de la industria, bajo footprint, soporte nativo en NestJS |
| Vector DB | **Qdrant** | Open source, imagen Docker liviana, API REST nativa, buen rendimiento para embeddings |
| AI Framework | **LangChain.js** | Integración nativa con Node.js/TypeScript, soporta múltiples proveedores LLM, pipeline RAG bien documentado |
| LLM Provider | **OpenAI** (configurable) | API más madura, configurable vía variables de entorno para cambiar proveedor |
| Message Broker | **RabbitMQ** | Más sencillo de operar localmente, soporte robusto en NestJS vía `@nestjs/microservices`, management UI incluida |
| Frontend | **React + TypeScript** | Ecosistema más amplio, flexibilidad de estado, menor boilerplate que Angular |
| Containerización | **Docker Compose** | Definición declarativa, healthchecks nativos, networking inter-contenedor |

---

## Architecture

### Diagrama de Arquitectura de Alto Nivel

> **Nota:** El Nginx Reverse Proxy es un componente **opcional** para simplificar el ruteo local. No se considera un microservicio ni genera tareas obligatorias. El frontend puede comunicarse directamente con los servicios por sus puertos expuestos.

```mermaid
graph TB
    subgraph Frontend
        FE[React SPA<br/>TypeScript + Vite]
    end

    subgraph "API Gateway (opcional)"
        GW[Nginx Reverse Proxy]
    end

    subgraph Microservices
        AUTH[Auth Service<br/>NestJS]
        USER[User Service<br/>NestJS]
        ROLE[Role Service<br/>NestJS]
        AUDIT[Audit Service<br/>NestJS]
        AI[AI Service<br/>NestJS + LangChain]
    end

    subgraph Data Layer
        PG[(PostgreSQL)]
        MONGO[(MongoDB)]
        REDIS[(Redis)]
        QDRANT[(Qdrant)]
    end

    subgraph Messaging
        RMQ[RabbitMQ]
    end

    FE --> GW
    GW --> AUTH
    GW --> USER
    GW --> ROLE
    GW --> AUDIT
    GW --> AI

    AUTH --> PG
    AUTH --> REDIS
    USER --> PG
    USER --> REDIS
    ROLE --> PG
    ROLE --> REDIS
    AI --> QDRANT
    AI --> REDIS
    AUDIT --> MONGO

    AUTH --> RMQ
    USER --> RMQ
    ROLE --> RMQ
    AI --> RMQ
    AUDIT --> RMQ

    AI -.->|REST sync| USER
    AI -.->|REST sync| ROLE
    ROLE -.->|REST sync| USER
```

### Diagrama de Comunicación Síncrona y Asíncrona

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant AUTH as Auth Service
    participant USER as User Service
    participant ROLE as Role Service
    participant AI as AI Service
    participant RMQ as RabbitMQ
    participant AUDIT as Audit Service

    FE->>AUTH: POST /auth/login (sync)
    AUTH->>AUTH: Validar credenciales
    AUTH-->>FE: JWT Token
    AUTH->>RMQ: publish(audit.event.login)

    FE->>USER: POST /users (sync, JWT)
    USER->>USER: Crear usuario
    USER-->>FE: 201 Created
    USER->>RMQ: publish(audit.event.user.created)

    RMQ->>AUDIT: consume(audit.event.*)
    AUDIT->>AUDIT: Persistir en MongoDB

    FE->>AI: POST /ai/query (sync, JWT)
    AI->>USER: GET /users/context (sync interno)
    AI->>AI: RAG Pipeline (embed + retrieve + LLM)
    AI-->>FE: Respuesta generada
    AI->>RMQ: publish(audit.event.ai.query)
```

---

## Components and Interfaces

### Descomposición de Microservicios

#### 1. Auth Service
**Responsabilidad:** Autenticación, emisión/validación de JWT, gestión de contraseñas.

| Endpoint | Método | Descripción |
|---|---|---|
| `/auth/login` | POST | Autenticación con credenciales |
| `/auth/validate` | POST | Validación interna de token (service-to-service) |
| `/auth/internal/credentials` | POST | Crear credenciales (interno, llamado desde User Service al crear usuario) |

> **Nota:** Un endpoint `/auth/refresh` para renovación de token es **opcional** y no genera tareas obligatorias.

**Validación JWT distribuida:** Cada microservicio validará JWT mediante configuración compartida de clave/secreto y lógica local equivalente, evitando dependencias directas entre servicios.

**HTTP Client para resolución de roles en login:** `RoleServiceClient` (ubicado en `src/infrastructure/http-clients/role-service.client.ts`) es invocado por `LoginUseCase` al autenticar un usuario. Llama a `GET /roles/user/{userId}` en Role Service con timeout 5s. Comportamiento ante fallos:
- Respuesta 404 → retorna `[]` (el usuario no tiene roles asignados aún).
- Timeout o indisponibilidad → lanza error controlado; el `LoginUseCase` decide si abortar el login o emitir token sin roles según configuración.

Este cliente garantiza que el campo `roles` del JWT refleje los roles asignados al momento del login (Requisito 2.3).

#### 2. User Service
**Responsabilidad:** Operaciones básicas de gestión de usuarios necesarias para cumplir la prueba técnica, validación de datos de usuario.

| Endpoint | Método | Descripción |
|---|---|---|
| `/users` | POST | Crear usuario |
| `/users` | GET | Consultar usuarios registrados de forma consultable para el frontend |
| `/users/:id` | GET | Obtener usuario por ID |
| `/users/:id` | PUT | Actualizar usuario |
| `/users/:id` | DELETE | Eliminar/desactivar usuario |
| `/users/context` | GET | Datos de contexto para AI Service (interno) |

#### 3. Role Service
**Responsabilidad:** Operaciones básicas de gestión de roles y asignación de roles a usuarios necesarias para cumplir la prueba técnica.

| Endpoint | Método | Descripción |
|---|---|---|
| `/roles` | POST | Crear rol |
| `/roles` | GET | Listar roles |
| `/roles/:id` | GET | Obtener rol por ID |
| `/roles/:id` | DELETE | Eliminar rol |
| `/roles/assign` | POST | Asignar rol a usuario |
| `/roles/unassign` | POST | Desasignar rol de usuario |

#### 4. Audit Service
**Responsabilidad:** Consumir eventos de auditoría del broker, persistir en MongoDB, exponer consulta básica.

| Endpoint | Método | Descripción |
|---|---|---|
| `/audit/events` | GET | Consultar o evidenciar registros básicos de auditoría generados por el sistema |

**Consumidor:** Escucha colas/topics del Message Broker para eventos de todos los servicios.

#### 5. AI Service
**Responsabilidad:** Pipeline RAG, interacción con LLM, generación de embeddings, registro de métricas.

| Endpoint | Método | Descripción |
|---|---|---|
| `/ai/query` | POST | Consulta en lenguaje natural (usuario autenticado) |
| `/ai/index` | POST | **Endpoint interno / script técnico** para ejecutar el pipeline de indexación de embeddings. No es funcionalidad de usuario final. |

> **Nota:** Las métricas de IA (latencia, tokens, costos) se registran en logs estructurados y/o Redis como parte del flujo de consulta. Un endpoint público `/ai/metrics` es **opcional** y no genera tareas obligatorias.

---

### Estructura DDD y Clean Architecture por Microservicio

Cada microservicio sigue la misma estructura de capas:

```
service-name/
├── src/
│   ├── domain/                    # Capa de Dominio (núcleo)
│   │   ├── entities/              # Entidades y Agregados
│   │   ├── value-objects/         # Value Objects
│   │   ├── repositories/          # Interfaces de repositorio (puertos)
│   │   ├── services/              # Servicios de dominio
│   │   └── events/                # Eventos de dominio
│   ├── application/               # Capa de Aplicación
│   │   ├── use-cases/             # Casos de uso (commands/queries)
│   │   ├── dtos/                  # Data Transfer Objects
│   │   ├── mappers/               # Mappers entidad <-> DTO
│   │   └── interfaces/            # Puertos de servicios externos
│   ├── infrastructure/            # Capa de Infraestructura
│   │   ├── persistence/           # Implementaciones de repositorio (TypeORM/Mongoose)
│   │   ├── messaging/             # Publishers/Consumers RabbitMQ
│   │   ├── cache/                 # Adaptador Redis
│   │   ├── http-clients/          # Clientes REST para otros servicios
│   │   └── config/                # Configuración y variables de entorno
│   └── presentation/              # Capa de Presentación (API)
│       ├── controllers/           # Controladores REST
│       ├── guards/                # Guards de autenticación/autorización
│       ├── filters/               # Exception filters
│       ├── interceptors/          # Logging, transform interceptors
│       └── validators/            # Pipes de validación (class-validator)
├── test/
│   ├── unit/                      # Tests unitarios
│   └── fixtures/                  # Datos de prueba
├── Dockerfile
└── tsconfig.json
```

**Regla de dependencia (Clean Architecture):** Las dependencias apuntan siempre hacia el dominio. La capa de dominio NO importa nada de infraestructura o presentación. La inversión de dependencias se logra mediante interfaces en el dominio e implementaciones inyectadas desde infraestructura.

---

## Data Models

### PostgreSQL — Auth Service

```
┌─────────────────────────────┐
│ users_credentials           │
├─────────────────────────────┤
│ id: UUID (PK)               │
│ username: VARCHAR(100) UQ   │
│ email: VARCHAR(255) UQ      │
│ password_hash: VARCHAR(255) │
│ is_active: BOOLEAN          │
│ last_login_at: TIMESTAMP    │
│ created_at: TIMESTAMP       │
│ updated_at: TIMESTAMP       │
└─────────────────────────────┘
```

### PostgreSQL — User Service

```
┌─────────────────────────────┐
│ users                       │
├─────────────────────────────┤
│ id: UUID (PK)               │
│ username: VARCHAR(100) UQ   │
│ email: VARCHAR(255) UQ      │
│ first_name: VARCHAR(100)    │
│ last_name: VARCHAR(100)     │
│ is_active: BOOLEAN          │
│ created_at: TIMESTAMP       │
│ updated_at: TIMESTAMP       │
└─────────────────────────────┘
```

### PostgreSQL — Role Service

```
┌─────────────────────────────┐       ┌─────────────────────────────┐
│ roles                       │       │ user_roles                  │
├─────────────────────────────┤       ├─────────────────────────────┤
│ id: UUID (PK)               │       │ id: UUID (PK)               │
│ name: VARCHAR(50) UQ        │       │ user_id: UUID (FK)          │
│ description: VARCHAR(255)   │       │ role_id: UUID (FK → roles)  │
│ created_at: TIMESTAMP       │       │ assigned_at: TIMESTAMP      │
│ updated_at: TIMESTAMP       │       │ assigned_by: UUID           │
└─────────────────────────────┘       └─────────────────────────────┘
                                       UNIQUE(user_id, role_id)
```

### MongoDB — Audit Service

```json
{
  "_id": "ObjectId",
  "event_type": "string",         // login, user.created, role.assigned, access.denied
  "actor_id": "UUID",             // Usuario que ejecutó la acción
  "actor_username": "string",
  "resource_type": "string",      // user, role, auth, ai
  "resource_id": "string|null",
  "action": "string",             // create, update, delete, login, query
  "details": {},                  // Metadata variable según evento
  "ip_address": "string",
  "correlation_id": "string",
  "timestamp": "ISODate",
  "service_origin": "string"      // Servicio que generó el evento
}
```

### Qdrant — AI Service (Colección de Embeddings)

```json
{
  "collection": "system_knowledge",
  "vector_size": 1536,            // dimensión OpenAI ada-002
  "distance": "Cosine",
  "payload_schema": {
    "source_type": "string",      // user_data, role_data, system_doc
    "source_id": "string",
    "content": "string",          // Texto original
    "metadata": {},               // Metadata adicional
    "indexed_at": "datetime"
  }
}
```

### Redis — Estructura de Claves

Redis se utiliza como caché para datos candidatos definidos por el diseño. Los patrones de clave son una referencia; la implementación puede ajustarse según necesidad.

| Patrón de Clave | TTL | Contenido |
|---|---|---|
| `user:{id}` | 5 min | JSON del usuario |
| `roles:list` | 5 min | Lista de roles |
| `user:{id}:roles` | 5 min | Roles asignados al usuario |

### Estrategia Multi-Base de Datos

- **PostgreSQL** (instancia compartida, schemas separados por servicio): Datos transaccionales de usuarios, credenciales y roles. Cada servicio tiene su propio schema para aislamiento lógico.
- **MongoDB** (instancia dedicada): Eventos de auditoría — schema flexible para eventos heterogéneos, optimizado para escrituras append-only y consulta básica de eventos generados por el sistema.
- **Redis** (instancia compartida, prefijos por servicio): Caché de lectura para datos candidatos definidos en este diseño.
- **Qdrant** (instancia dedicada): Almacenamiento de embeddings vectoriales para pipeline RAG.

---

## Diseño del Pipeline AI/RAG

### Flujo del Pipeline

```mermaid
flowchart LR
    subgraph Indexación
        A[Datos del Sistema] --> B[Chunking]
        B --> C[Generación de Embeddings<br/>OpenAI ada-002]
        C --> D[Almacenamiento en Qdrant]
    end

    subgraph Consulta RAG
        E[Query del Usuario] --> F[Embedding de la Query]
        F --> G[Búsqueda Semántica<br/>Qdrant Top-K]
        G --> H[Contexto Recuperado]
        H --> I[Prompt Assembly<br/>System + Context + Query]
        I --> J[LLM OpenAI]
        J --> K[Respuesta al Usuario]
    end
```

### Componentes del Pipeline

1. **Indexador:** Obtiene datos de User Service y Role Service vía REST, los divide en chunks semánticos, genera embeddings y los almacena en Qdrant. Se ejecuta como script/endpoint interno, no como funcionalidad de usuario final.
2. **Retriever:** Convierte la query del usuario en un embedding, busca los K documentos más similares en Qdrant (K=5 por defecto).
3. **Prompt Builder:** Ensambla el prompt final con: system prompt (instrucciones y restricciones), contexto recuperado, y la consulta del usuario.
4. **LLM Client:** Envía el prompt al proveedor LLM configurado, registra latencia y tokens consumidos en logs estructurados.
5. **Metrics Logger:** Registra métricas de cada consulta (latencia, tokens de entrada/salida, costo estimado) en logs estructurados JSON y opcionalmente en Redis.

### Estrategia de Prompt Engineering

```
[System Prompt]
Eres un asistente del sistema de gestión de usuarios. Responde únicamente
basándote en el contexto proporcionado. Si no encuentras información 
relevante en el contexto, indica que no tienes suficiente información.
No inventes datos.

[Contexto Recuperado]
{documentos_relevantes_de_qdrant}

[Consulta del Usuario]
{query_original}
```

---

## Diseño de Comunicación entre Servicios

### Comunicación Síncrona (REST)

- **Frontend → Servicios:** Todas las operaciones básicas de gestión requeridas por la prueba técnica y consultas.
- **AI Service → User/Role Service:** Obtención de datos de contexto para indexación y consultas en tiempo real.
- **Role Service → User Service:** Validación de existencia de usuario al asignar roles.
- **Validación JWT:** Cada microservicio validará JWT mediante configuración compartida de clave/secreto y lógica local equivalente (no requiere llamada REST para cada request).

**Resiliencia (obligatorio):**
- Timeout configurable (default: 5s) en llamadas inter-servicio.
- Manejo controlado de errores: si un servicio dependiente no responde, el servicio origen retorna un error controlado al cliente sin propagar fallas en cascada.
- Logging de fallos de comunicación entre servicios.

**Mejoras opcionales (no generan tareas obligatorias):**
- Retry con backoff exponencial.
- Circuit breaker.
- Estas mejoras se pueden agregar posteriormente si se identifica la necesidad.

### Comunicación Asíncrona (RabbitMQ)

**Exchanges y Colas:**

| Exchange | Tipo | Routing Key | Cola | Consumidor |
|---|---|---|---|---|
| `audit.events` | topic | `audit.auth.*` | `audit.auth.queue` | Audit Service |
| `audit.events` | topic | `audit.user.*` | `audit.user.queue` | Audit Service |
| `audit.events` | topic | `audit.role.*` | `audit.role.queue` | Audit Service |
| `audit.events` | topic | `audit.ai.*` | `audit.ai.queue` | Audit Service |

**Formato del Mensaje de Auditoría:**

```json
{
  "event_type": "user.created",
  "actor_id": "uuid",
  "actor_username": "admin",
  "resource_type": "user",
  "resource_id": "uuid",
  "action": "create",
  "details": { "fields_changed": ["email", "name"] },
  "ip_address": "192.168.1.1",
  "correlation_id": "uuid",
  "timestamp": "2024-01-15T10:30:00Z",
  "service_origin": "user-service"
}
```

**Garantías (obligatorio):**
- Mensajes persistentes (durable queues).
- Acknowledgement manual tras procesamiento exitoso.

**Mejoras opcionales (no generan tareas obligatorias):**
- Dead Letter Queue (DLQ) para mensajes fallidos.
- Buffer local para retener eventos si RabbitMQ no está disponible temporalmente.

---

## Diseño del Frontend

### Arquitectura del Frontend

```mermaid
graph TB
    subgraph React SPA
        subgraph Pages
            LOGIN[Login Page]
            USERS[Users Management]
            ROLES[Roles Management]
            AUDIT[Audit Viewer]
            AICHAT[AI Chat]
        end
        
        subgraph State Management
            STORE[Zustand Store]
            AUTH_SLICE[Auth Slice]
            USER_SLICE[Users Slice]
            ROLE_SLICE[Roles Slice]
        end

        subgraph Core
            ROUTER[React Router<br/>Protected Routes]
            HTTP[Axios Instance<br/>Interceptors JWT]
            VALID[Form Validation<br/>React Hook Form + Zod]
        end
    end

    LOGIN --> AUTH_SLICE
    USERS --> USER_SLICE
    ROLES --> ROLE_SLICE
    ROUTER --> LOGIN
    HTTP --> STORE
```

### Stack del Frontend

| Librería | Propósito | Obligatorio |
|---|---|---|
| React 18 + TypeScript | Framework UI | **Sí** |
| Vite | Build tool | **Sí** |
| React Router v6 | Routing + protected routes | **Sí** |
| Zustand | Estado global (ligero, sin boilerplate) | **Sí** |
| Axios | HTTP client con interceptors | **Sí** |
| React Hook Form + Zod | Validación de formularios | **Sí** |
| TanStack Query | Cache de server state, loading/error states | Opcional |
| Tailwind CSS | Estilos utilitarios | Opcional |

El stack obligatorio debe cubrir: React + TypeScript, state management, cliente HTTP, validación de formularios, loading states, error states, feedback visual y tests básicos.

### Estrategia de Autenticación en Frontend

1. Login exitoso → almacenar JWT en memoria (Zustand store, NO localStorage por seguridad).
2. Axios interceptor adjunta `Authorization: Bearer {token}` a cada request.
3. Interceptor de respuesta detecta 401 → limpia estado y redirige a login.
4. Protected routes wrapper verifica existencia de token en store antes de renderizar.

---

## Diseño de Infraestructura Docker Compose

### Servicios y Dependencias

```yaml
# Estructura conceptual del docker-compose.yml
services:
  # --- Infraestructura ---
  postgres:        # Puerto 5432
  mongodb:         # Puerto 27017
  redis:           # Puerto 6379
  rabbitmq:        # Puertos 5672 (AMQP) + 15672 (Management UI)
  qdrant:          # Puerto 6333

  # --- Microservicios ---
  auth-service:    # Puerto 3001 | depends_on: postgres, redis, rabbitmq
  user-service:    # Puerto 3002 | depends_on: postgres, redis, rabbitmq
  role-service:    # Puerto 3003 | depends_on: postgres, redis, rabbitmq
  audit-service:   # Puerto 3004 | depends_on: mongodb, rabbitmq
  ai-service:      # Puerto 3005 | depends_on: qdrant, redis, rabbitmq

  # --- Frontend ---
  frontend:        # Puerto 80 (Nginx sirviendo build estático)

  # --- Reverse Proxy (opcional) ---
  # nginx:         # Puerto 8080 → ruteo a servicios (opcional, no obligatorio)
```

### Health Checks

Cada servicio define un healthcheck:
- **PostgreSQL:** `pg_isready`
- **MongoDB:** `mongosh --eval "db.runCommand('ping')"`
- **Redis:** `redis-cli ping`
- **RabbitMQ:** `rabbitmq-diagnostics -q ping`
- **Qdrant:** `curl -f http://localhost:6333/`
- **Microservicios NestJS:** `GET /health` (endpoint dedicado con checks de dependencias)

Los servicios usan `depends_on` con condición `service_healthy` para orquestar el arranque.

### Variables de Entorno

```env
# LLM (único componente que requiere clave externa)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
EMBEDDING_MODEL=text-embedding-ada-002

# Bases de datos (configuración local)
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=user_management
MONGODB_URI=mongodb://mongodb:27017/audit
REDIS_URL=redis://redis:6379
QDRANT_URL=http://qdrant:6333

# JWT
JWT_SECRET=local-development-secret
JWT_EXPIRATION=3600

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

---

## Diseño de Seguridad

### Capas de Seguridad

1. **Autenticación:** JWT firmado con HS256 (local). Expiración configurable. Validación distribuida mediante clave/secreto compartido.
2. **Autorización:** Guard de roles basado en decoradores (`@Roles('admin')`). Los roles se extraen del JWT payload.
3. **Validación de entrada:** `class-validator` + `class-transformer` en todos los DTOs. Pipes globales de validación en NestJS.
4. **Protección SQL Injection:** TypeORM con parámetros enlazados (prepared statements). Nunca concatenación de strings en queries.
5. **Protección XSS:** Sanitización de salidas con `helmet` middleware. Content-Security-Policy headers. React escapa HTML por defecto.
6. **Rate Limiting:** `@nestjs/throttler` en endpoints de auth (max 5 intentos/min por IP).
7. **Headers de seguridad:** Helmet.js (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security).
8. **Error handling:** Exception filters globales que nunca exponen stack traces ni información interna al cliente.

### Flujo de Autenticación/Autorización

```mermaid
sequenceDiagram
    participant Client
    participant Guard as JWT Guard
    participant RoleGuard as Role Guard
    participant Controller

    Client->>Guard: Request + Bearer Token
    Guard->>Guard: Verificar firma y expiración
    alt Token inválido
        Guard-->>Client: 401 Unauthorized
    end
    Guard->>RoleGuard: Token válido, usuario extraído
    RoleGuard->>RoleGuard: Verificar roles vs endpoint
    alt Sin permiso
        RoleGuard-->>Client: 403 Forbidden
    end
    RoleGuard->>Controller: Request autorizado
    Controller-->>Client: Response
```

---

## Diseño de Logging y Observabilidad

### Estructura del Log

Cada microservicio utiliza un logger estructurado (Winston/Pino) configurado para emitir JSON:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "info",
  "service": "user-service",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "User created successfully",
  "context": {
    "method": "POST",
    "path": "/users",
    "status_code": 201,
    "duration_ms": 45,
    "user_id": "actor-uuid"
  }
}
```

### Estrategia de Logging

| Evento | Nivel | Campos adicionales |
|---|---|---|
| Request HTTP entrante | info | method, path, status_code, duration_ms |
| Error de aplicación | error | error_message, stack_trace, context |
| Validación fallida | warn | fields, validation_errors |
| Conexión a servicio externo | info/error | service_name, latency_ms |
| Evento de auditoría publicado | info | event_type, routing_key |
| Consulta IA procesada | info | latency_ms, tokens_in, tokens_out, cost_estimate |

### Correlation ID

- Generado en el primer servicio que recibe el request.
- Propagado en header `X-Correlation-ID` en llamadas REST inter-servicio.
- Incluido en mensajes RabbitMQ como property del mensaje.
- Permite trazar una operación completa a través de múltiples servicios.

---

## Error Handling

### Estrategia Global

Cada microservicio implementa un **Exception Filter global** en NestJS que:

1. Captura todas las excepciones no manejadas.
2. Clasifica el error (dominio, validación, infraestructura, externo).
3. Registra log con nivel `error` incluyendo stack trace y contexto.
4. Retorna al cliente un response estandarizado sin información sensible.

### Formato de Error Estandarizado

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "Must be a valid email address" }
  ],
  "correlation_id": "uuid",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Errores por Capa

| Capa | Tipo de Error | HTTP Code | Acción |
|---|---|---|---|
| Presentación | Validación de DTO | 400 | Retornar detalles de campo |
| Aplicación | Regla de negocio violada | 422 | Retornar mensaje descriptivo |
| Dominio | Entidad no encontrada | 404 | Retornar recurso no encontrado |
| Dominio | Conflicto de unicidad | 409 | Retornar conflicto |
| Infraestructura | DB no disponible | 503 | Log + fallback a caché si aplica |
| Infraestructura | Servicio externo caído | 503 | Error controlado + mensaje genérico |
| Infraestructura | Rate limit excedido | 429 | Retornar Retry-After header |

### Resiliencia ante Fallos (Obligatorio)

- **Redis caído:** Los servicios continúan operando sin caché, consultando directamente la DB.
- **Servicio dependiente caído (REST):** El servicio origen maneja el timeout y retorna error controlado sin cascada.
- **LLM no disponible:** AI Service retorna 503 con mensaje descriptivo sin afectar otros servicios.
- **Logging de fallos:** Todos los fallos de comunicación se registran en logs estructurados.

### Mejoras Opcionales de Resiliencia (no generan tareas obligatorias)

- Retry con backoff exponencial para llamadas inter-servicio.
- Circuit breaker (falla abierta tras N errores consecutivos).
- Dead Letter Queue (DLQ) para mensajes RabbitMQ fallidos.
- Buffer local para eventos si RabbitMQ no está disponible temporalmente.

---

## Diseño del Entregable de Diagnóstico Técnico

Como parte de la evaluación, se entregará un archivo Markdown (por ejemplo `diagnostico_tecnico.md`) con una respuesta escrita para un escenario de fallo en producción donde los usuarios no pueden guardar registros, algunos microservicios responden con errores 500 y hay alta latencia en respuestas de agentes de IA.

El documento debe incluir:

1. **Hipótesis de causa raíz:** Posibles causas del fallo basadas en la arquitectura del sistema.
2. **Plan de diagnóstico:** Pasos para identificar el origen del problema usando logs estructurados y técnicas de debugging.
3. **Uso de logs estructurados:** Cómo utilizar los logs JSON con correlation ID para correlacionar eventos entre microservicios.
4. **Uso de logs centralizados:** Estrategia para agregar y consultar logs de todos los servicios desde un punto centralizado.
5. **Problemas de comunicación entre servicios:** Análisis de fallos en comunicación REST y mensajería asíncrona.
6. **Latencia de IA:** Diagnóstico de alta latencia en el pipeline RAG y llamadas al proveedor LLM.
7. **Costos de tokens:** Análisis de consumo de tokens y su impacto en el presupuesto y rendimiento.
8. **Rate limiting:** Evaluación de límites de tasa del proveedor LLM y estrategias de mitigación.
9. **Comunicación con stakeholders:** Plan de comunicación durante el incidente, incluyendo actualizaciones de progreso y estimaciones.

Este entregable es independiente del código y se evalúa como ejercicio de razonamiento técnico y comunicación.

---

## Testing Strategy

### Estrategia Obligatoria de Testing

El sistema debe cumplir los siguientes requisitos mínimos de testing:

1. **Tests unitarios** en microservicios con cobertura mínima del **70%**.
2. **Tests básicos** de componentes y lógica en el frontend.
3. **Comando documentado** para ejecutar todos los tests (`npm run test:all` o equivalente).
4. **Coverage report** generado al ejecutar los tests.

### Herramientas de Testing

| Componente | Herramienta | Propósito |
|---|---|---|
| Backend (NestJS) | Jest | Tests unitarios y de integración |
| Backend (HTTP) | Supertest | Tests de endpoints/controllers |
| Frontend (componentes) | Vitest + React Testing Library | Tests de componentes |
| Frontend (lógica) | Vitest | Tests de validación, estado, utils |

### Tests del Backend

Los tests unitarios deben cubrir:
- Lógica de dominio (entidades, value objects, servicios de dominio).
- Casos de uso de la capa de aplicación.
- Guards de autenticación y autorización.
- Validación de DTOs.
- Exception filters.

### Tests del Frontend

| Tipo | Qué Verifica |
|---|---|
| Componentes | Renderizado correcto, interacción de usuario |
| Estado | Transiciones del store (Zustand) |
| Validación | Schemas de formularios con datos válidos e inválidos |
| Routing | Redirección de rutas protegidas |
| API | Manejo de loading y error states |

### Ejecución de Tests

```bash
# Comando único para ejecutar todos los tests
npm run test:all

# Coverage report
npm run test:coverage
```

---

## Apéndice: Correctness Properties (Opcional)

> **Nota:** Esta sección es un apéndice opcional de referencia. Las propiedades descritas aquí representan características de correctitud ideales del sistema pero **no generan tareas obligatorias** de implementación. El equipo puede optar por implementar property-based testing como mejora de calidad adicional.

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema.*

### Property 1: Generación de Token con Claims Correctos

*Para cualquier* usuario válido con un conjunto de roles asignados, el token JWT generado SHALL contener el `user_id`, `username` y exactamente los roles asignados al usuario.

**Validates: Requirements 1.1, 2.3**

### Property 2: Credenciales Inválidas Producen Rechazo Genérico

*Para cualquier* combinación de credenciales inválidas, Auth Service SHALL retornar un código 401 con un mensaje que no revele cuál credencial es incorrecta.

**Validates: Requirements 1.2**

### Property 3: Validación de Token Acepta/Rechaza Correctamente

*Para cualquier* token presentado (válido, expirado, malformado, firma incorrecta o ausente), el guard SHALL aceptar el request si y solo si el token es válido, no expirado y correctamente firmado.

**Validates: Requirements 1.3, 1.4**

### Property 4: Round Trip de Hashing de Contraseña

*Para cualquier* contraseña, al hashear y luego verificar, la verificación SHALL retornar verdadero. Verificar cualquier otra contraseña contra el mismo hash SHALL retornar falso.

**Validates: Requirements 1.5**

### Property 5: Decisión de Acceso Basada en Roles

*Para cualquier* usuario con un conjunto de roles y endpoint con roles requeridos, el guard SHALL conceder acceso si y solo si hay intersección no vacía entre ambos conjuntos.

**Validates: Requirements 2.1, 2.2**

### Property 6: Validación de DTOs Rechaza Datos Inválidos

*Para cualquier* payload con campos inválidos, el validador SHALL rechazar con código 400 y mensajes específicos por campo.

**Validates: Requirements 3.6**

### Property 7: Sanitización de Entradas

*Para cualquier* string con payloads de inyección, la sanitización SHALL producir un resultado libre de contenido ejecutable.

**Validates: Requirements 9.1, 9.2**

### Property 8: Respuestas de Error Ocultan Información Sensible

*Para cualquier* excepción interna, la respuesta al cliente SHALL NO contener stack traces, rutas internas ni versiones de dependencias.

**Validates: Requirements 9.6**

### Property 9: Logs Producen JSON Estructurado Válido

*Para cualquier* invocación del logger, la salida SHALL ser JSON válido con los campos obligatorios (timestamp, level, service, message).

**Validates: Requirements 12.1, 12.2**

### Property 10: Cache Hit Retorna desde Redis sin Consultar DB

*Para cualquier* dato existente en caché con TTL no expirado, el servicio SHALL retornarlo sin consultar la DB principal.

**Validates: Requirements 15.2**

---
