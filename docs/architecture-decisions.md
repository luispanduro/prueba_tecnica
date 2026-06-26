# Decisiones de Arquitectura — DDD, Clean Architecture y CQRS

## 1. Justificación de decisiones técnicas

| Tecnología | Rol en el sistema | Justificación | Alternativa descartada |
|---|---|---|---|
| **NestJS + TypeScript** | Framework backend (6 microservicios) | Inyección de dependencias nativa (ideal para Clean Architecture), módulos bien delimitados que mapean 1:1 con bounded contexts DDD, `@nestjs/cqrs` sin dependencias externas, `@nestjs/microservices` con transporte AMQP nativo. TypeScript unifica el stack completo. | Python/FastAPI (excelente para AI pero genera inconsistencia de stack en servicios no-AI). C#/.NET 8 (más verboso para un monorepo con 6 servicios). |
| **TypeORM** | ORM para PostgreSQL (Auth, User, Role Service) | Decoradores TypeScript para entidades, `synchronize` en desarrollo, Repository pattern alineado con DDD: `Repository<Entity>` como implementación concreta de la interfaz de dominio. | Prisma (más ergonómico pero menos alineado con el Repository pattern del DDD clásico). |
| **Mongoose** | ODM para MongoDB (Audit Service) | API document-first, schema tipado con decoradores, flexibilidad de schema para logs heterogéneos. Índices declarativos para queries de auditoría. | TypeORM con MongoDB (soporte experimental y menos maduro para documentos). |
| **PostgreSQL 16** | BD relacional (auth_db, users_db, roles_db) | ACID completo, soporte nativo de UUID y JSONB, una sola instancia con 3 databases para reducir recursos en local sin sacrificar aislamiento lógico. | MySQL (menos soporte de tipos avanzados). SQLite (sin soporte de concurrent writers para producción). |
| **MongoDB 7** | BD documental (audit_db) | Schema flexible para eventos de auditoría heterogéneos. Índice único en `eventId` para idempotencia. Queries de agregación nativas para estadísticas. | PostgreSQL con JSONB (posible, pero menos natural para colecciones de documentos con queries de rango por fecha). |
| **RabbitMQ 3** | Mensajería asíncrona entre servicios | Exchange `topic` para enrutado flexible de eventos por routing key (`auth.user.*`, `users.user.*`). Dead-letter queues integradas. Management UI en :15672. Soporte nativo en `@nestjs/microservices`. | Kafka (mayor throughput, pero requiere ZooKeeper/KRaft y overhead operacional superior para el scope del proyecto). |
| **Redis 7** | Cache y almacenamiento de tokens | TTL nativo para refresh tokens (7 días). Blacklisting de access tokens revocados. Cache de permisos por usuario. Estructuras key-value simples y de bajísima latencia. | Memcached (sin TTL por key ni persistencia). Base de datos relacional (latencia demasiado alta para validación por request). |
| **Qdrant** | Vector database para el AI Service | Imagen Docker oficial, API REST+gRPC, filtros por payload (filtra chunks por fuente de documento), compatible con LangChain.js `QdrantVectorStore`. | Chroma (menos features de filtrado avanzado). Pinecone (requiere cuenta externa de pago). |
| **OpenAI API** | LLM + embeddings | GPT-4o-mini: excelente relación calidad/coste para consultas de gestión de usuarios. text-embedding-3-small: 1536 dimensiones, bajo coste, alta calidad semántica. | Anthropic Claude (excelente calidad pero menor integración en LangChain.js y menos documentación de ejemplos RAG). Modelos open-source locales (requieren GPU, no disponible en entorno de desarrollo). |
| **LangChain.js v0.3** | Framework RAG | Mismo ecosistema TypeScript. Abstracciones nativas: `VectorStoreRetriever`, `TokenTextSplitter`, `MetricsCallback`. Integración directa con Qdrant y OpenAI. | LlamaIndex.TS (menos maduro, documentación más escasa). Implementación manual (mayor tiempo de desarrollo sin beneficio de abstracción). |
| **React 18 + Vite + RTK Query** | Frontend SPA | Vite: HMR instantáneo. RTK Query: gestión automática de estados loading/error/success, caché con invalidación selectiva por tag, elimina boilerplate de async thunks. Redux Toolkit: slice pattern reduce boilerplate de Redux clásico. | Next.js (SSR innecesario para un admin panel SPA). Create React App (deprecado, Vite es la alternativa oficial). |

---

## 2. Aplicación de DDD por servicio

### 2.1 Auth Service — Bounded Context: Identidad y Autenticación

**Bounded Context**: gestiona exclusivamente las credenciales de acceso (email + hash de contraseña). No conoce el perfil del usuario ni sus roles; esa información pertenece a otros bounded contexts.

**Aggregate Root**: `UserCredentials`
- Invariante: el email debe cumplir formato RFC 5322 (validado en el Value Object `Email`).
- Invariante: la contraseña nunca se almacena en texto plano (siempre como `PasswordHash` con bcrypt cost 12).
- Invariante: una credencial inactiva no puede autenticarse (`isActive` verificado antes de `verifyPassword`).
- Encapsula: `deactivate()` y `reactivate()` como únicos puntos de cambio de estado.

**Value Objects**:
| VO | Validaciones |
|---|---|
| `Email` | Formato RFC 5322, normaliza a lowercase |
| `PasswordHash` | Encapsula `bcrypt.hash(12)` y `bcrypt.compare()` — nunca expone el hash directamente |

**Domain Events publicados**:
- `auth.user.registered` — al crear credenciales
- `auth.user.login.success` — login exitoso con IP y userAgent
- `auth.user.login.failed` — credencial no encontrada, inactiva o contraseña incorrecta (con `reason`)
- `auth.user.logout` — al revocar tokens

**Repository interface**: `ICredentialsRepository`
```typescript
findByEmail(email: Email): Promise<UserCredentials | null>
save(credentials: UserCredentials): Promise<void>
delete(id: string): Promise<void>
```
Implementación concreta: `CredentialsTypeormRepository` (en `infrastructure/persistence/typeorm/`) — el dominio nunca importa TypeORM.

---

### 2.2 Role Service — Bounded Context: Roles y Permisos

**Bounded Context**: define qué roles existen y qué permisos otorga cada uno. Es la fuente de verdad para la autorización; otros servicios consultan aquí para validar roleIds.

**Aggregate Root**: `Role`
- Invariante: el nombre no puede contener espacios y se almacena en UPPERCASE.
- Invariante: los permisos deben cumplir el formato `resource:action` (ej: `users:read`).
- Invariante: los roles de sistema (`isSystem: true`) no pueden ser renombrados ni eliminados.
- Encapsula: `addPermission()` (sin duplicados), `removePermission()` (error si no existe), `rename()` (bloqueado para roles del sistema).

**Value Objects**:
| VO | Validaciones |
|---|---|
| `RoleName` | No vacío, sin espacios, UPPERCASE, máx 50 chars |
| `Permission` | Regex `/^[a-z_]+:[a-z_*]+$/`, formato `resource:action` obligatorio |

**Domain Events publicados**:
- `roles.role.created`
- `roles.role.updated`
- `roles.role.deleted`

**Repository interface**: `IRoleRepository`
```typescript
findById(id: string): Promise<Role | null>
findByName(name: RoleName): Promise<Role | null>
findAll(): Promise<Role[]>
save(role: Role): Promise<void>
delete(id: string): Promise<void>
```
Implementación concreta: `RoleTypeormRepository`.

---

### 2.3 User Service — Bounded Context: Gestión de Usuarios

**Bounded Context**: gestiona el perfil de los usuarios (nombre, email, estado) y sus asignaciones de roles (roleIds). No valida contraseñas; no define qué permisos otorga un rol.

**Aggregate Root**: `User`
- Invariante: el email debe ser único en el sistema.
- Invariante: `assignRole(roleId)` no duplica un roleId ya asignado.
- Invariante: `removeRole(roleId)` lanza error si el roleId no estaba asignado.
- Encapsula: `deactivate()` / `activate()` como únicos puntos de cambio de estado; `update(name, email)` emite evento con array de `changes` diferenciando campos modificados.

**Value Objects**:
| VO | Validaciones |
|---|---|
| `Email` | Mismo que Auth Service (duplicado intencionalmente — cada BC tiene su propia copia) |
| `FullName` | firstName y lastName no vacíos, máx 100 chars en total |
| `UserStatus` | Enum `ACTIVE` / `INACTIVE` |

**Domain Events publicados**:
- `users.user.created`
- `users.user.updated` (con array `changes`)
- `users.user.deleted`
- `users.user.role.assigned`
- `users.user.role.removed`

**Repository interface**: `IUserRepository`
```typescript
findById(id: string): Promise<User | null>
findByEmail(email: Email): Promise<User | null>
findAll(params: GetUsersParams): Promise<{ items: User[]; total: number }>
save(user: User): Promise<void>
delete(id: string): Promise<void>
```
Implementación concreta: `UserTypeormRepository`.

**Nota de autonomía**: el User Service valida la existencia de roles mediante `RoleServiceClient` (HTTP con circuit breaker) antes de `assignRole()`, sin importar código del Role Service.

---

### 2.4 Audit Service — Bounded Context: Auditoría

**Bounded Context**: registra inmutablemente todos los eventos de dominio del sistema. No genera eventos propios; es puramente receptor y consultor.

**Aggregate Root**: `AuditLog` (entidad de solo escritura en el contexto DDD)
- Invariante: cada `AuditLog` tiene un `eventId` único (índice único en MongoDB) — garantiza idempotencia de procesamiento.
- Invariante: el `timestamp` refleja cuándo ocurrió el evento en el servicio origen, no cuándo se procesó.
- `status` solo acepta `'success'` o `'failure'`.

**Value Objects / Schema Mongoose**:
Campos esenciales: `eventType`, `service`, `userId`, `resourceType`, `action`, `status`, `correlationId`, `eventId`, `timestamp`.

**Domain Events consumidos** (12 tipos de 3 servicios origen):
Auth Service (4), User Service (5), Role Service (3).

**Repository interface**: implícito en `AuditLogModel` (Mongoose), con métodos de consulta paginada y agregación en el controlador.

---

### 2.5 AI Service — Bounded Context: Asistencia Inteligente

**Bounded Context**: responde preguntas sobre el sistema usando RAG (Retrieval Augmented Generation). No posee entidades de usuario ni roles; consulta al User Service cuando necesita datos en vivo.

**Aggregate Root / Entidad**: `QueryMetric`
- Registra métricas de cada consulta: `queryId`, latencias (`embedding`, `retrieval`, `llm`, `total`), tokens, costo estimado, flags de calidad.
- Inmutable tras creación (append-only).

**Domain Services**:
| Servicio | Responsabilidad |
|---|---|
| `CostCalculatorService` | Calcula costo en USD: `(inputTokens/1M × $0.15) + (outputTokens/1M × $0.60)` |
| `ResponseValidatorService` | Valida calidad de la respuesta y retorna quality flags (`empty_response`, `too_short`, `low_retrieval_score`, `no_context_found`) |

**Domain Events**: ninguno publicado (el AI Service no emite eventos al bus de mensajería).

---

## 3. Aplicación de Clean Architecture

### Regla de dependencia

> Las dependencias solo apuntan hacia adentro: `Infrastructure → Application → Domain`. El dominio no importa nada de las capas externas.

### Diagrama textual de capas (por microservicio NestJS)

```
┌─────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE LAYER (capa más externa)                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  HTTP        │  │  Persistence │  │  Messaging    │  │
│  │  Controllers │  │  TypeORM /   │  │  RabbitMQ     │  │
│  │  DTOs        │  │  Mongoose    │  │  Publisher    │  │
│  │  Guards      │  │  Repositories│  │  Consumer     │  │
│  │  Filters     │  │  (concretas) │  │               │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │           │
│  ┌──────▼─────────────────▼──────────────────▼────────┐  │
│  │  APPLICATION LAYER                                  │  │
│  │                                                     │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐  │  │
│  │  │  Commands       │  │  Queries                 │  │  │
│  │  │  + Handlers     │  │  + Handlers              │  │  │
│  │  │  (CommandBus)   │  │  (QueryBus)              │  │  │
│  │  └────────┬────────┘  └────────────┬─────────────┘  │  │
│  └───────────┼────────────────────────┼───────────────┘  │
│              │                        │                   │
│  ┌───────────▼────────────────────────▼───────────────┐  │
│  │  DOMAIN LAYER (núcleo — sin dependencias externas) │  │
│  │                                                    │  │
│  │  Entities / Aggregates   Value Objects             │  │
│  │  Domain Events           Repository interfaces     │  │
│  │  Domain Exceptions       Domain Services           │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Aplicación concreta de la regla de dependencia

| Capa | Puede importar | No puede importar |
|---|---|---|
| `domain/` | Solo Node.js built-ins y librerías puras (bcrypt, uuid) | `@nestjs/*`, TypeORM, Mongoose, Redis, RabbitMQ |
| `application/` | `domain/` + `@nestjs/cqrs` decoradores | TypeORM, Mongoose, Redis, ioredis, amqplib |
| `infrastructure/` | `application/`, `domain/`, cualquier librería externa | Nada adicional (ya está en la capa más externa) |

**Ejemplo concreto — flujo de `LoginCommand`:**
1. `AuthController` (infrastructure) recibe POST → crea `LoginCommand` → envía al `CommandBus`
2. `LoginHandler` (application) recibe el comando → llama `ICredentialsRepository.findByEmail()` (interfaz de dominio)
3. `CredentialsTypeormRepository` (infrastructure) implementa la interfaz → ejecuta query TypeORM
4. El handler devuelve el resultado → el controlador lo serializa como respuesta HTTP

El handler nunca importa TypeORM. El repositorio concreto nunca es importado por la capa de aplicación directamente.

---

## 4. Aplicación de CQRS

### Servicios que implementan CQRS

| Servicio | ¿Usa CQRS? | Justificación |
|---|---|---|
| Auth Service | ✅ Sí | Separación clara entre operaciones de escritura (register, login, logout, refresh) y lectura (validate token). Handlers testables de forma aislada. |
| Role Service | ✅ Sí | CRUD de roles con lógica de negocio (invariantes de sistema), separado de consultas de solo lectura. |
| User Service | ✅ Sí | Operaciones de escritura con efectos secundarios (publicar eventos, llamar circuit breaker) vs. queries paginadas de solo lectura. |
| Audit Service | ⚡ Parcial | Sin Commands formales — el consumidor RabbitMQ actúa como handler implícito. Las queries del controlador son directas al repositorio (sin QueryBus). |
| AI Service | ⚡ Parcial | Use cases en lugar de Commands/Queries formales. `QueryAgentUseCase` y `IndexDocumentsUseCase` encapsulan la lógica sin el overhead de CommandBus (las operaciones de IA son asíncronas y no tienen side effects en DB relacionales). |

### Commands por servicio

**Auth Service**:
| Command | Handler | Efecto |
|---|---|---|
| `RegisterUserCommand(email, password)` | `RegisterUserHandler` | Crea credencial, publica `auth.user.registered` |
| `LoginCommand(email, password, ip, userAgent)` | `LoginHandler` | Valida credencial, genera tokens JWT+Refresh, guarda en Redis, publica evento |
| `LogoutCommand(userId, jti, tokenId)` | `LogoutHandler` | Blacklistea `jti` en Redis, elimina refreshToken |
| `RefreshTokenCommand(refreshToken)` | `RefreshTokenHandler` | Rota tokens: invalida el anterior, genera nuevos |

**Auth Service — Queries**:
| Query | Handler | Retorna |
|---|---|---|
| `ValidateTokenQuery(token)` | `ValidateTokenHandler` | Payload decodificado del JWT (verificado + no blacklisteado) |

---

**Role Service — Commands**:
| Command | Handler | Efecto |
|---|---|---|
| `CreateRoleCommand` | `CreateRoleHandler` | Verifica nombre único, crea Role, guarda, publica `roles.role.created` |
| `UpdateRoleCommand` | `UpdateRoleHandler` | Actualiza descripción, publica `roles.role.updated` |
| `DeleteRoleCommand` | `DeleteRoleHandler` | Verifica `!isSystem`, elimina, publica `roles.role.deleted` |
| `AddPermissionCommand` | `AddPermissionHandler` | Llama `role.addPermission()`, guarda, publica `roles.role.updated` |
| `RemovePermissionCommand` | `RemovePermissionHandler` | Llama `role.removePermission()`, guarda, publica `roles.role.updated` |

**Role Service — Queries**:
| Query | Handler | Retorna |
|---|---|---|
| `GetRoleQuery(id)` | `GetRoleHandler` | DTO del rol o NotFoundException |
| `GetRolesQuery` | `GetRolesHandler` | Array de DTOs de todos los roles |
| `GetRolePermissionsQuery(id)` | `GetRolePermissionsHandler` | Array de permisos del rol |

---

**User Service — Commands**:
| Command | Handler | Efecto |
|---|---|---|
| `CreateUserCommand` | `CreateUserHandler` | Verifica email único, valida roleIds vía RoleServiceClient, crea User, guarda, publica `users.user.created` |
| `UpdateUserCommand` | `UpdateUserHandler` | Actualiza campos, guarda, publica `users.user.updated` con array `changes` |
| `DeleteUserCommand` | `DeleteUserHandler` | Elimina, publica `users.user.deleted` |
| `AssignRoleCommand` | `AssignRoleHandler` | Valida rol existe (RoleServiceClient), `user.assignRole()`, guarda, publica `users.user.role.assigned` |
| `RemoveRoleCommand` | `RemoveRoleHandler` | `user.removeRole()`, guarda, publica `users.user.role.removed` |

**User Service — Queries**:
| Query | Handler | Retorna |
|---|---|---|
| `GetUserQuery(id)` | `GetUserHandler` | DTO del usuario o NotFoundException |
| `GetUsersQuery(page, limit, filters)` | `GetUsersHandler` | `{ items, total, page, limit }` paginado |
| `GetUserRolesQuery(userId)` | `GetUserRolesHandler` | Obtiene roleIds del user, consulta Role Service, retorna array de roles completos |

---

## 5. Flujos de datos entre microservicios

### 5.1 Flujo: Login de usuario

```
1.  Usuario ingresa credenciales en LoginForm.tsx
2.  react-hook-form valida: email válido, password no vacío
3.  RTK Query ejecuta: authApi.useLoginMutation()
4.  Frontend → POST /api/auth/login { email, password }
5.  BFF: genera correlationId (X-Correlation-Id), proxy a Auth Service
6.  Auth Service: busca UserCredentials en PostgreSQL por email
7.  Auth Service: bcrypt.compare(password, passwordHash)
8.  Auth Service: genera AccessToken JWT (15 min) con { sub, email, roles, permissions, jti }
9.  Auth Service: genera tokenId (uuid), almacena RefreshToken en Redis (TTL 7 días)
10. Auth Service: genera RefreshToken JWT con { sub, tokenId }
11. Auth Service: publica auth.user.login.success → RabbitMQ exchange toka.events
12. Auth Service → BFF: { accessToken, refreshToken }
13. BFF → Frontend: { accessToken, refreshToken }
14. authSlice: almacena tokens y perfil de usuario en Redux state
15. redux-persist: serializa state a localStorage
16. Router: redirige a /dashboard
17. [Async] RabbitMQ → Audit Service: consume auth.user.login.success
18. Audit Service: verifica idempotencia por eventId → inserta AuditLog en MongoDB
```

**Servicios involucrados**: Frontend → BFF → Auth Service → PostgreSQL → Redis → RabbitMQ → Audit Service → MongoDB

---

### 5.2 Flujo: Consulta al Agente IA

```
1.  Usuario escribe pregunta en AIAssistantChat.tsx
2.  Frontend → POST /api/ai/query { query, userId }
3.  BFF: valida JWT localmente, inyecta X-User-Id header, proxy a AI Service (timeout 35s)
4.  AI Service: recibe query en QueryAgentUseCase.execute()
5.  AI Service: genera embedding de la query con text-embedding-3-small [~100ms]
6.  AI Service: busca en Qdrant top-5 chunks similares (scoreThreshold: 0.7) [~50ms]
7.  AI Service: (si userId) → GET /users/:userId en User Service vía UserServiceClient [~30ms]
8.  AI Service: construye prompt completo (SYSTEM_PROMPT + contexto + datos_usuario + pregunta)
9.  AI Service: llama GPT-4o-mini con MetricsCallback (max 800 tokens, temp 0.3) [~1500-3000ms]
10. AI Service: captura métricas vía callback (llmLatencyMs, promptTokens, completionTokens)
11. AI Service: calcula costo USD con CostCalculatorService
12. AI Service: valida calidad con ResponseValidatorService (quality flags)
13. AI Service: persiste QueryMetric en PostgreSQL
14. AI Service → BFF: { queryId, answer, sources, metrics }
15. BFF → Frontend: respuesta completa
16. AIAssistantChat.tsx: renderiza respuesta + MetricsBadge (latencia, costo estimado)
```

**Servicios involucrados**: Frontend → BFF → AI Service → Qdrant → User Service → OpenAI API → PostgreSQL

---

### 5.3 Flujo: Asignación de rol a usuario

```
1.  Usuario selecciona rol en RoleAssignmentModal.tsx
2.  Frontend → POST /api/users/:id/roles { roleId }
3.  BFF: valida JWT, verifica permiso users:write en payload del token
4.  BFF → User Service: POST /users/:id/roles { roleId } (propaga X-User-Id, X-Correlation-Id)
5.  User Service: despacha AssignRoleCommand al CommandBus
6.  AssignRoleHandler: busca User en PostgreSQL por id → NotFoundException si no existe
7.  AssignRoleHandler → Role Service: GET /roles/:roleId vía RoleServiceClient (timeout 3s, circuit breaker)
8.  Role Service → User Service: Role data (HTTP 200) o 404/503 si está caído
9.  AssignRoleHandler: user.assignRole(roleId) en entidad de dominio (verifica no duplicado)
10. AssignRoleHandler: persiste User actualizado en PostgreSQL (UPDATE role_ids)
11. AssignRoleHandler: publica users.user.role.assigned → RabbitMQ exchange toka.events
12. User Service → BFF: HTTP 200 { userId, roleId }
13. BFF → Frontend: HTTP 200
14. RTK Query: invalida cache del tag 'User' → refetch automático de la lista de usuarios
15. [Async] Audit Service: consume users.user.role.assigned → inserta AuditLog en MongoDB
```

**Servicios involucrados**: Frontend → BFF → User Service → Role Service → PostgreSQL → RabbitMQ → Audit Service → MongoDB

**Punto de resiliencia**: si Role Service está caído al ejecutar el paso 7, el circuit breaker (opossum) se abre tras 50% de fallos en ventana de 30s y el fallback lanza `ServiceUnavailableException` (HTTP 503). El circuit breaker se cierra automáticamente tras 30 segundos para re-intentar.
