# Tasks — Sistema de Gestión de Usuarios con Microservicios e IA

> Fuente de verdad: `design.md` | Cada tarea referencia la sección del design que implementa.

---

## Convenciones

- **Estado**: `[ ]` pendiente · `[x]` completado · `[-]` en progreso
- **Prioridad**: `P0` bloqueante · `P1` crítico · `P2` importante · `P3` complementario
- **Dependencias**: listadas como `→ TASK-XXX` al final de cada tarea
- Todos los archivos se crean dentro de `toka-user-mgmt/` (raíz del monorepo)
- Ningún servicio importa código de otro servicio directamente (principio de autonomía)

---

## FASE 0 — Setup del Monorepo

### TASK-001 · Crear estructura de directorios del monorepo `P0`

Crear manualmente la siguiente estructura de carpetas vacías. No crear ningún archivo todavía, solo los directorios:

```
toka-user-mgmt/
├── services/
│   ├── auth-service/
│   ├── user-service/
│   ├── role-service/
│   ├── audit-service/
│   ├── ai-service/
│   └── bff/
├── frontend/
├── scripts/
└── docs/
```

**Criterios de aceptación**:
- [x] Los 6 directorios bajo `services/` existen y están vacíos
- [x] Los directorios `frontend/`, `scripts/` y `docs/` existen

---

### TASK-002 · Crear `.gitignore` y `.env.example` raíz `P0`

**Archivo**: `toka-user-mgmt/.gitignore`

Contenido mínimo:
```
node_modules/
dist/
.env
*.env.local
coverage/
.DS_Store
```

**Archivo**: `toka-user-mgmt/.env.example`

Contenido exacto (estas son TODAS las variables del sistema):
```bash
# PostgreSQL
POSTGRES_USER=toka_user
POSTGRES_PASSWORD=change_me_in_prod
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# MongoDB
MONGO_USER=toka_mongo
MONGO_PASSWORD=change_me_in_prod
MONGO_HOST=mongodb
MONGO_PORT=27017

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=change_me_in_prod

# RabbitMQ
RABBITMQ_USER=toka_rmq
RABBITMQ_PASSWORD=change_me_in_prod
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672

# JWT
JWT_SECRET=minimum_256_bit_random_string_replace_this
JWT_EXPIRES_IN=900
REFRESH_TOKEN_TTL=604800

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

**Criterios de aceptación**:
- [x] `.gitignore` excluye `node_modules/`, `.env` y `dist/`
- [x] `.env.example` contiene las 24 variables documentadas arriba
- [x] `.env` (copia de `.env.example` con valores reales) está en `.gitignore`

---

### TASK-003 · Crear script de inicialización multi-DB de PostgreSQL `P0`

**Archivo**: `toka-user-mgmt/scripts/create-multiple-dbs.sh`

Este script es ejecutado por el contenedor de PostgreSQL al iniciar por primera vez. Crea las tres bases de datos necesarias:

```bash
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE DATABASE auth_db;
  CREATE DATABASE users_db;
  CREATE DATABASE roles_db;
  GRANT ALL PRIVILEGES ON DATABASE auth_db TO $POSTGRES_USER;
  GRANT ALL PRIVILEGES ON DATABASE users_db TO $POSTGRES_USER;
  GRANT ALL PRIVILEGES ON DATABASE roles_db TO $POSTGRES_USER;
EOSQL
```

Hacer el archivo ejecutable: `chmod +x scripts/create-multiple-dbs.sh`

**Criterios de aceptación**:
- [x] El archivo existe con permisos de ejecución
- [x] Crea exactamente: `auth_db`, `users_db`, `roles_db`
- [x] Otorga privilegios completos al usuario `$POSTGRES_USER`

---

## FASE 1 — Infraestructura Docker Compose

### TASK-004 · Crear `docker-compose.yml` completo `P0`

**Archivo**: `toka-user-mgmt/docker-compose.yml`

Crear el archivo con EXACTAMENTE los siguientes servicios, redes y volúmenes. Respetar nombres, imágenes y puertos del design §11:

**Servicios de infraestructura**:

```yaml
version: '3.9'

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
  data-net:
    driver: bridge

volumes:
  postgres-data:
  mongodb-data:
  redis-data:
  rabbitmq-data:
  qdrant-data:

services:
  postgres:
    image: postgres:16-alpine
    container_name: toka-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/create-multiple-dbs.sh:/docker-entrypoint-initdb.d/init.sh
    networks: [data-net]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  mongodb:
    image: mongo:7
    container_name: toka-mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb-data:/data/db
    networks: [data-net]
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7-alpine
    container_name: toka-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks: [data-net]
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: toka-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    networks: [backend-net]
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  qdrant:
    image: qdrant/qdrant:latest
    container_name: toka-qdrant
    volumes:
      - qdrant-data:/qdrant/storage
    ports:
      - "6333:6333"
      - "6334:6334"
    networks: [data-net]
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:6333/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**Servicios de microservicios** (agregar al mismo archivo):

```yaml
  role-service:
    build:
      context: ./services/role-service
      dockerfile: Dockerfile
    container_name: toka-role-service
    env_file: ./services/role-service/.env
    ports:
      - "3003:3003"
    depends_on:
      postgres:  { condition: service_healthy }
      rabbitmq:  { condition: service_healthy }
    networks: [backend-net, data-net]
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:3003/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s

  auth-service:
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
    container_name: toka-auth-service
    env_file: ./services/auth-service/.env
    ports:
      - "3001:3001"
    depends_on:
      postgres:      { condition: service_healthy }
      redis:         { condition: service_healthy }
      rabbitmq:      { condition: service_healthy }
      role-service:  { condition: service_healthy }
    networks: [backend-net, data-net]
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:3001/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s

  user-service:
    build:
      context: ./services/user-service
      dockerfile: Dockerfile
    container_name: toka-user-service
    env_file: ./services/user-service/.env
    ports:
      - "3002:3002"
    depends_on:
      postgres:      { condition: service_healthy }
      rabbitmq:      { condition: service_healthy }
      role-service:  { condition: service_healthy }
    networks: [backend-net, data-net]
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:3002/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s

  audit-service:
    build:
      context: ./services/audit-service
      dockerfile: Dockerfile
    container_name: toka-audit-service
    env_file: ./services/audit-service/.env
    ports:
      - "3005:3005"
    depends_on:
      mongodb:   { condition: service_healthy }
      rabbitmq:  { condition: service_healthy }
    networks: [backend-net, data-net]
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:3005/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s

  ai-service:
    build:
      context: ./services/ai-service
      dockerfile: Dockerfile
    container_name: toka-ai-service
    env_file: ./services/ai-service/.env
    ports:
      - "3004:3004"
    depends_on:
      qdrant:        { condition: service_healthy }
      user-service:  { condition: service_healthy }
    networks: [backend-net, data-net]
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:3004/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s

  bff:
    build:
      context: ./services/bff
      dockerfile: Dockerfile
    container_name: toka-bff
    env_file: ./services/bff/.env
    ports:
      - "3000:3000"
    depends_on:
      auth-service:   { condition: service_healthy }
      user-service:   { condition: service_healthy }
      role-service:   { condition: service_healthy }
      audit-service:  { condition: service_healthy }
      ai-service:     { condition: service_healthy }
    networks: [backend-net, frontend-net]
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:3000/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: toka-frontend
    ports:
      - "80:80"
    depends_on:
      bff: { condition: service_healthy }
    networks: [frontend-net]
```

**Criterios de aceptación**:
- [x] 12 servicios declarados (5 infraestructura + 6 microservicios + 1 frontend)
- [x] Todas las 3 redes declaradas: `frontend-net`, `backend-net`, `data-net`
- [x] Todos los 5 volúmenes declarados
- [x] Todos los servicios tienen `healthcheck` definido (11/12; frontend usa nginx sin endpoint /health)
- [x] `depends_on` con `condition: service_healthy` en todos los microservicios (19 ocurrencias)
- [x] Solo `bff`, `rabbitmq`, `qdrant` y los microservicios exponen puertos al host

→ Depende de: TASK-001, TASK-002, TASK-003

---

## FASE 2 — Auth Service

### TASK-005 · Inicializar proyecto NestJS del Auth Service `P0`

Dentro de `services/auth-service/`, ejecutar:
```bash
npx @nestjs/cli new . --package-manager npm --skip-git
```

Luego instalar dependencias exactas:
```bash
npm install @nestjs/cqrs @nestjs/jwt @nestjs/passport @nestjs/typeorm @nestjs/microservices
npm install passport passport-jwt typeorm pg bcrypt ioredis amqplib amqp-connection-manager
npm install class-validator class-transformer @nestjs/config nest-winston winston uuid
npm install -D @types/bcrypt @types/passport-jwt @types/uuid @types/amqplib
```

**Archivo**: `services/auth-service/.env`
```bash
NODE_ENV=development
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_NAME=auth_db
DB_USER=${POSTGRES_USER}
DB_PASSWORD=${POSTGRES_PASSWORD}
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
REFRESH_TOKEN_TTL=${REFRESH_TOKEN_TTL}
ROLE_SERVICE_URL=http://role-service:3003
SEED_ADMIN_EMAIL=${SEED_ADMIN_EMAIL}
SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD}
LOG_LEVEL=${LOG_LEVEL}
```

**Archivo**: `services/auth-service/tsconfig.json`
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2021",
    "strict": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": { "@/*": ["src/*"] }
  }
}
```

**Criterios de aceptación**:
- [x] `npm run start:dev` arranca sin errores en puerto 3001
- [x] `npm run build` compila sin errores TypeScript
- [x] `.env` existe con las 18 variables listadas

→ Depende de: TASK-001

---

### TASK-006 · Auth Service — Domain Layer `P0`

Crear los siguientes archivos dentro de `services/auth-service/src/domain/`:

**`value-objects/email.vo.ts`**
- Clase `Email` con propiedad privada `readonly value: string`
- Constructor: recibe `string`, valida formato RFC 5322 con regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, lanza `InvalidEmailException` si inválido, normaliza a lowercase
- Método `getValue(): string`
- Método estático `create(value: string): Email`

**`value-objects/password-hash.vo.ts`**
- Clase `PasswordHash` con propiedad privada `readonly hash: string`
- Método estático `async create(plainText: string): Promise<PasswordHash>` — usa `bcrypt.hash(plainText, 12)`
- Método `async verify(plainText: string): Promise<boolean>` — usa `bcrypt.compare(plainText, this.hash)`
- Método `getValue(): string`

**`entities/user-credentials.entity.ts`**
- Clase `UserCredentials` con propiedades: `id: string` (UUID), `email: Email`, `passwordHash: PasswordHash`, `isActive: boolean`, `createdAt: Date`, `updatedAt: Date`
- Constructor privado; factory estático `create(id, email, passwordHash): UserCredentials`
- Método `verifyPassword(plain: string): Promise<boolean>` — delega a `passwordHash.verify()`
- Método `deactivate(): void` — setea `isActive = false`
- Método `reactivate(): void` — setea `isActive = true`

**`events/user-registered.event.ts`** — clase con: `userId`, `email`, `timestamp`
**`events/user-logged-in.event.ts`** — clase con: `userId`, `email`, `ip`, `timestamp`
**`events/user-login-failed.event.ts`** — clase con: `email`, `ip`, `reason: 'invalid_credentials' | 'account_inactive'`, `timestamp`
**`events/user-logged-out.event.ts`** — clase con: `userId`, `timestamp`

**`repositories/credentials.repository.interface.ts`**
```typescript
export interface ICredentialsRepository {
  findByEmail(email: Email): Promise<UserCredentials | null>;
  save(credentials: UserCredentials): Promise<void>;
  delete(id: string): Promise<void>;
}
export const CREDENTIALS_REPOSITORY = 'CREDENTIALS_REPOSITORY';
```

**`exceptions/invalid-email.exception.ts`** — extiende `BadRequestException`
**`exceptions/invalid-credentials.exception.ts`** — extiende `UnauthorizedException`
**`exceptions/account-inactive.exception.ts`** — extiende `ForbiddenException`

**Criterios de aceptación**:
- [x] `Email.create('invalid')` lanza `InvalidEmailException`
- [x] `Email.create('Test@EXAMPLE.COM').getValue()` retorna `'test@example.com'`
- [x] `PasswordHash.create('pass').verify('pass')` resuelve `true`
- [x] `UserCredentials` no importa nada de `infrastructure/` ni `application/`
- [x] Las 4 clases de eventos existen con sus propiedades correctas

→ Depende de: TASK-005

---

### TASK-007 · Auth Service — TypeORM Entity e Infrastructure Repository `P0`

**`infrastructure/persistence/typeorm/entities/user-credentials.typeorm-entity.ts`**

Entidad TypeORM que mapea a tabla `user_credentials`:
```typescript
@Entity('user_credentials')
export class UserCredentialsTypeormEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**`infrastructure/persistence/typeorm/repositories/credentials.typeorm-repository.ts`**

Clase `CredentialsTypeormRepository` que:
- Implementa `ICredentialsRepository`
- Recibe `Repository<UserCredentialsTypeormEntity>` via DI
- `findByEmail`: busca por `email` (lowercase), mapea entidad TypeORM → dominio `UserCredentials`
- `save`: mapea dominio → TypeORM entity y llama `repository.save()`
- `delete`: llama `repository.delete({ id })`
- El mapeo dominio ↔ TypeORM entity se hace en métodos privados `toDomain()` y `toPersistence()`

**`infrastructure/persistence/typeorm/auth-database.module.ts`**

Módulo NestJS que configura TypeORM:
```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    database: config.get('DB_NAME'),
    username: config.get('DB_USER'),
    password: config.get('DB_PASSWORD'),
    entities: [UserCredentialsTypeormEntity],
    synchronize: config.get('NODE_ENV') === 'development',
    logging: false,
  }),
  inject: [ConfigService],
})
```

**Criterios de aceptación**:
- [x] La tabla `user_credentials` se crea automáticamente al arrancar en dev (synchronize=true)
- [x] `CredentialsTypeormRepository` implementa todos los métodos de `ICredentialsRepository`
- [x] El mapeo entre dominio y persistence no expone la entidad TypeORM fuera de `infrastructure/`

→ Depende de: TASK-006

---

### TASK-008 · Auth Service — Redis Repository (tokens) `P0`

**`infrastructure/persistence/redis/redis.module.ts`**

Módulo que provee cliente `ioredis`:
```typescript
{
  provide: 'REDIS_CLIENT',
  useFactory: (config: ConfigService) => new Redis({
    host: config.get('REDIS_HOST'),
    port: config.get<number>('REDIS_PORT'),
    password: config.get('REDIS_PASSWORD'),
  }),
  inject: [ConfigService],
}
```

**`infrastructure/persistence/redis/token.redis-repository.ts`**

Clase `TokenRedisRepository` con métodos:
- `saveRefreshToken(userId, tokenId, ttlSeconds): Promise<void>` → `SET refresh_token:{userId}:{tokenId} "1" EX {ttlSeconds}`
- `validateRefreshToken(userId, tokenId): Promise<boolean>` → `EXISTS refresh_token:{userId}:{tokenId}`
- `deleteRefreshToken(userId, tokenId): Promise<void>` → `DEL refresh_token:{userId}:{tokenId}`
- `blacklistToken(jti, ttlSeconds): Promise<void>` → `SET token_blacklist:{jti} "1" EX {ttlSeconds}`
- `isTokenBlacklisted(jti): Promise<boolean>` → `EXISTS token_blacklist:{jti}`
- `cachePermissions(userId, permissions, ttlSeconds): Promise<void>` → `SET permissions_cache:{userId} {JSON} EX {ttlSeconds}`
- `getCachedPermissions(userId): Promise<string[] | null>`

**Criterios de aceptación**:
- [x] Todos los métodos usan el prefijo de key exacto del design (`refresh_token:`, `token_blacklist:`, `permissions_cache:`)
- [x] TTL se pasa como parámetro (no hardcodeado)
- [x] `TokenRedisRepository` no importa nada de `domain/` ni `application/`

→ Depende de: TASK-005

---

### TASK-009 · Auth Service — RabbitMQ Event Publisher `P0`

**`infrastructure/messaging/rabbitmq/event-publisher.ts`**

Clase `RabbitmqEventPublisher` que:
- Recibe cliente AMQP via DI (token `'RABBITMQ_CLIENT'`)
- Método `publish(routingKey: string, event: DomainEvent): Promise<void>`
- Exchange: `toka.events`, tipo `topic`, durable: `true`
- El `DomainEvent` tiene la forma exacta del design §6.2.2:
  ```typescript
  interface DomainEvent {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    occurredAt: string;
    correlationId: string;
    payload: Record<string, unknown>;
    version: number;
  }
  ```
- Loguea `info` antes de publicar con `action: 'event.published'`, `routingKey` y `eventId`
- En caso de error al publicar: loguea `error` con `action: 'event.publish.failed'` y **no** propaga la excepción (el fallo de auditoría no debe romper el flujo principal)

**`infrastructure/messaging/rabbitmq/rabbitmq.module.ts`**

Módulo que provee el cliente AMQP usando `amqp-connection-manager`:
```typescript
{
  provide: 'RABBITMQ_CLIENT',
  useFactory: (config: ConfigService) =>
    connect([config.get('RABBITMQ_URL')]),
  inject: [ConfigService],
}
```

**Criterios de aceptación**:
- [x] El publisher usa exactamente el exchange `toka.events`
- [x] Un error de RabbitMQ NO propaga excepción (catch silencioso con log)
- [x] El evento cumple el schema `DomainEvent` con todos sus campos

→ Depende de: TASK-005

---

### TASK-010 · Auth Service — CQRS: Commands y Handlers `P0`

Crear en `src/application/`:

**`commands/register-user.command.ts`**
```typescript
export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}
```

**`handlers/register-user.handler.ts`** — `@CommandHandler(RegisterUserCommand)`
Lógica:
1. Verificar que no exista credencial con ese email (llamar `ICredentialsRepository.findByEmail`); si existe → lanzar `ConflictException('Email already registered')`
2. Crear `Email` VO (puede lanzar `InvalidEmailException`)
3. Crear `PasswordHash` VO con `bcrypt cost 12`
4. Crear `UserCredentials` con `uuid()` como id
5. Guardar con `ICredentialsRepository.save()`
6. Publicar evento `auth.user.registered` con payload `{ userId, email }`
7. Retornar `{ userId, email }`

**`commands/login.command.ts`** — propiedades: `email`, `password`, `ip`, `userAgent`

**`handlers/login.handler.ts`** — `@CommandHandler(LoginCommand)`
Lógica:
1. Buscar credencial por email; si no existe → publicar `auth.user.login.failed` con reason `invalid_credentials` → lanzar `InvalidCredentialsException`
2. Si `!isActive` → publicar `auth.user.login.failed` con reason `account_inactive` → lanzar `AccountInactiveException`
3. `verifyPassword(password)`; si false → publicar `auth.user.login.failed` → lanzar `InvalidCredentialsException`
4. Generar `accessToken` JWT con payload: `{ sub: userId, email, roles: [], permissions: [], jti: uuid() }`
   - Usar `JwtService.sign()` con `expiresIn: JWT_EXPIRES_IN`
5. Generar `tokenId = uuid()`, guardar en Redis con `saveRefreshToken(userId, tokenId, REFRESH_TOKEN_TTL)`
6. Generar `refreshToken` JWT con payload `{ sub: userId, tokenId }`
7. Publicar `auth.user.login.success` con payload `{ userId, email, ip, userAgent }`
8. Retornar `{ accessToken, refreshToken, expiresIn: JWT_EXPIRES_IN }`

**`commands/logout.command.ts`** — propiedades: `userId`, `jti`, `tokenId`

**`handlers/logout.handler.ts`** — `@CommandHandler(LogoutCommand)`
Lógica:
1. Blacklistear el `jti` en Redis con TTL = `JWT_EXPIRES_IN`
2. Eliminar RefreshToken de Redis con `deleteRefreshToken(userId, tokenId)`
3. Publicar `auth.user.logout` con payload `{ userId }`

**`commands/refresh-token.command.ts`** — propiedades: `refreshToken`

**`handlers/refresh-token.handler.ts`** — `@CommandHandler(RefreshTokenCommand)`
Lógica:
1. Verificar firma del refreshToken con `JwtService.verify()`; si inválido → `UnauthorizedException`
2. Extraer `{ sub: userId, tokenId }` del payload
3. Validar en Redis que `refresh_token:{userId}:{tokenId}` existe; si no → `UnauthorizedException('Refresh token expired or revoked')`
4. Eliminar el refresh token anterior
5. Generar nuevo `accessToken` y `refreshToken`
6. Guardar nuevo refresh token en Redis
7. Retornar `{ accessToken, refreshToken, expiresIn }`

**`queries/validate-token.query.ts`** — propiedades: `token`

**`handlers/validate-token.handler.ts`** — `@QueryHandler(ValidateTokenQuery)`
Lógica:
1. Verificar firma con `JwtService.verify(token)`; si inválido → `UnauthorizedException`
2. Verificar que `jti` NO está en blacklist Redis
3. Retornar payload decodificado

**Criterios de aceptación**:
- [x] Ningún handler importa TypeORM, Redis o RabbitMQ directamente (usa interfaces/tokens DI)
- [x] `LoginHandler` publica evento de fallo ANTES de lanzar excepción
- [x] `LogoutHandler` blacklistea el `jti` en Redis
- [x] Todos los handlers están decorados con `@CommandHandler` o `@QueryHandler`

→ Depende de: TASK-006, TASK-007, TASK-008, TASK-009

---

### TASK-011 · Auth Service — Controller, DTOs y Guards `P0`

**`infrastructure/http/dtos/register.dto.ts`**
```typescript
export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password: string;
}
```

**`infrastructure/http/dtos/login.dto.ts`**
```typescript
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**`infrastructure/http/dtos/refresh-token.dto.ts`** — campo `refreshToken: string`

**`infrastructure/http/guards/jwt-auth.guard.ts`**
- Extiende `AuthGuard('jwt')`
- Sobrescribe `handleRequest` para verificar también blacklist en Redis
- Si token está en blacklist → lanzar `UnauthorizedException('Token has been revoked')`

**`infrastructure/http/guards/jwt.strategy.ts`**
- Extiende `PassportStrategy(Strategy, 'jwt')`
- `fromRequest`: `ExtractJwt.fromAuthHeaderAsBearerToken()`
- `secretOrKey`: de `ConfigService`
- `validate(payload)`: retorna `{ userId: payload.sub, email: payload.email, roles: payload.roles, permissions: payload.permissions, jti: payload.jti }`

**`infrastructure/http/controllers/auth.controller.ts`**

Rutas exactas del design §4.1.3:
- `POST /auth/register` → `RegisterUserCommand` → HTTP 201
- `POST /auth/login` → `LoginCommand` (extrae IP de `req.ip`, userAgent de `req.headers['user-agent']`) → HTTP 200
- `POST /auth/logout` → requiere `@UseGuards(JwtAuthGuard)` → `LogoutCommand` → HTTP 204
- `POST /auth/refresh` → `RefreshTokenCommand` → HTTP 200
- `GET /auth/validate` → `ValidateTokenQuery` → HTTP 200

Aplicar globalmente en el módulo:
```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
```

**Criterios de aceptación**:
- [x] `POST /auth/register` con body inválido retorna HTTP 400 con errores de validación
- [x] `POST /auth/logout` sin JWT retorna HTTP 401
- [x] `POST /auth/login` con credenciales incorrectas retorna HTTP 401
- [x] `ValidationPipe` tiene `whitelist: true` (rechaza propiedades no declaradas en DTO)

→ Depende de: TASK-010

---

### TASK-012 · Auth Service — Logging, Health y Seed `P0`

**Logging** — `src/app.module.ts`:
Configurar `WinstonModule.forRootAsync()` con:
- Transport: `Console` con `winston.format.combine(timestamp(), json())`
- Level: desde `ConfigService.get('LOG_LEVEL')`, default `'info'`
- Inyectar `WINSTON_MODULE_PROVIDER` en todos los handlers y controllers

**Formato de cada log** (cumplir design §12.1):
```json
{
  "timestamp": "ISO-8601",
  "level": "info|warn|error|debug",
  "service": "auth-service",
  "correlationId": "uuid",
  "action": "string",
  "userId": "uuid|null",
  "duration": 0,
  "metadata": {}
}
```

**`infrastructure/http/interceptors/logging.interceptor.ts`**
- Interceptor NestJS que loguea `info` al inicio y al final de cada request con `duration`
- Extrae `correlationId` de `req.headers['x-correlation-id']`

**`infrastructure/http/controllers/health.controller.ts`**
- `GET /health` — sin autenticación
- Verifica: conexión a PostgreSQL (query `SELECT 1`), conexión a Redis (`PING`), conexión a RabbitMQ
- Responde:
  ```json
  {
    "status": "ok|degraded|down",
    "service": "auth-service",
    "timestamp": "ISO-8601",
    "dependencies": {
      "database": "ok|down",
      "redis": "ok|down",
      "rabbitmq": "ok|down"
    }
  }
  ```

**`infrastructure/seeds/admin.seed.ts`**
- Función `seedAdminUser(credentialsRepo, configService)` que:
  1. Verifica si ya existe credencial con `SEED_ADMIN_EMAIL`
  2. Si no existe: crea con `SEED_ADMIN_PASSWORD` usando `PasswordHash.create()`
  3. Loguea `info` con `action: 'seed.admin.created'` o `action: 'seed.admin.exists'`
- Llamar desde `main.ts` después de `app.listen()`

**Criterios de aceptación**:
- [x] `GET /health` retorna HTTP 200 con las 3 dependencias verificadas
- [x] Al iniciar el servicio, los logs son JSON puro (un objeto JSON por línea)
- [x] Al iniciar con BD vacía, el usuario `SEED_ADMIN_EMAIL` se crea automáticamente
- [x] Al iniciar con usuario admin ya existente, no se crea duplicado

→ Depende de: TASK-010, TASK-011

---

### TASK-013 · Auth Service — Tests unitarios (≥70% coverage) `P1`

Crear en `services/auth-service/test/unit/`:

**`value-objects/email.vo.spec.ts`**
- `Email.create('valid@email.com')` → crea instancia correctamente
- `Email.create('UPPER@EMAIL.COM').getValue()` → retorna en lowercase
- `Email.create('invalid')` → lanza `InvalidEmailException`
- `Email.create('')` → lanza `InvalidEmailException`

**`value-objects/password-hash.vo.spec.ts`**
- `PasswordHash.create('password123').verify('password123')` → true
- `PasswordHash.create('password123').verify('wrongpass')` → false

**`entities/user-credentials.entity.spec.ts`**
- `deactivate()` → `isActive === false`
- `reactivate()` → `isActive === true`
- `verifyPassword` delega a `PasswordHash.verify()`

**`handlers/register-user.handler.spec.ts`**
- Mock de `ICredentialsRepository` y `RabbitmqEventPublisher`
- Caso éxito: guarda credencial y publica `auth.user.registered`
- Caso duplicado: lanza `ConflictException` sin guardar
- Caso email inválido: lanza `InvalidEmailException`

**`handlers/login.handler.spec.ts`**
- Caso éxito: retorna `accessToken` y `refreshToken`
- Caso credencial no encontrada: publica evento de fallo, lanza `UnauthorizedException`
- Caso cuenta inactiva: publica evento de fallo con reason correcto, lanza excepción
- Caso password incorrecto: publica evento de fallo, lanza `UnauthorizedException`

**`handlers/logout.handler.spec.ts`**
- Blacklistea `jti` en Redis
- Elimina refresh token de Redis
- Publica `auth.user.logout`

**`jest.config.ts`**:
```typescript
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/main.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/typeorm-entity.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: { global: { lines: 70, functions: 70, branches: 65 } },
  testEnvironment: 'node',
};
```

**Criterios de aceptación**:
- [x] `npm run test:cov` pasa sin errores (44 tests, 9 suites)
- [x] Coverage report generado en `coverage/lcov-report/index.html`
- [x] Coverage de líneas ≥ 70% (98.93% obtenido)
- [x] No hay mocks de módulos completos de NestJS — se mockean interfaces específicas

→ Depende de: TASK-010, TASK-011, TASK-012

---

### TASK-014 · Auth Service — Dockerfile multi-stage `P1`

**Archivo**: `services/auth-service/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD ["node", "dist/main.js"]
```

**Criterios de aceptación**:
- [x] `docker build -t auth-service .` en el directorio del servicio completa sin errores
- [x] La imagen final NO contiene `node_modules` de desarrollo (`--omit=dev` en stage production)
- [x] El contenedor arranca y `GET /health` responde HTTP 200 (verificable al levantar con docker compose)

→ Depende de: TASK-012

---

## FASE 3 — Role Service

### TASK-015 · Role Service — Inicialización y Domain Layer `P0` ✅

Inicializar proyecto NestJS igual que en TASK-005, cambiando `PORT=3003` y `DB_NAME=roles_db`.

Dependencias adicionales: mismas que auth-service excepto `bcrypt`, `ioredis` y `passport`.

**`.env`** del Role Service:
```bash
PORT=3003
DB_HOST=postgres
DB_PORT=5432
DB_NAME=roles_db
DB_USER=${POSTGRES_USER}
DB_PASSWORD=${POSTGRES_PASSWORD}
RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
JWT_SECRET=${JWT_SECRET}
LOG_LEVEL=${LOG_LEVEL}
```

**Domain Layer** en `src/domain/`:

**`value-objects/role-name.vo.ts`**
- Clase `RoleName` con `readonly value: string`
- Validaciones: no vacío, sin espacios, convierte a UPPERCASE, max 50 chars
- Lanza `InvalidRoleNameException` si inválido

**`value-objects/permission.vo.ts`**
- Clase `Permission` con `readonly value: string`
- Formato requerido: `resource:action` (regex `/^[a-z_]+:[a-z_*]+$/`)
- Lanza `InvalidPermissionException` si formato incorrecto

**`entities/role.entity.ts`** — Aggregate Root:
- Propiedades: `id: string`, `name: RoleName`, `description: string`, `permissions: Permission[]`, `isSystem: boolean`, `createdAt: Date`, `updatedAt: Date`
- Factory estático `create(id, name, description, isSystem): Role`
- `addPermission(permission: Permission): void` — no duplicar
- `removePermission(permission: Permission): void` — error si no existe
- `rename(name: RoleName): void` — error si `isSystem === true`

**`events/`**: `RoleCreatedEvent`, `RoleUpdatedEvent`, `RoleDeletedEvent` con sus campos del design §4.3

**`repositories/role.repository.interface.ts`**:
```typescript
export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: RoleName): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  save(role: Role): Promise<void>;
  delete(id: string): Promise<void>;
}
export const ROLE_REPOSITORY = 'ROLE_REPOSITORY';
```

**Criterios de aceptación**:
- [x] `RoleName.create('ADMIN')` → válido
- [x] `RoleName.create('admin role')` → lanza excepción (espacio no permitido)
- [x] `Permission.create('users:read')` → válido
- [x] `Permission.create('invalid')` → lanza excepción
- [x] `role.rename()` en un role con `isSystem=true` lanza error

→ Depende de: TASK-001

---

### TASK-016 · Role Service — Infrastructure, CQRS, Controller y Seed `P0` ✅

**TypeORM Entity** (`role.typeorm-entity.ts`):
```typescript
@Entity('roles')
export class RoleTypeormEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string;
  @Column({ nullable: true }) description: string;
  @Column('simple-array', { default: '' }) permissions: string[];
  @Column({ default: false }) isSystem: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

**CQRS Commands** (crear en `src/application/commands/`):
- `CreateRoleCommand` → handler verifica nombre único, crea `Role`, guarda, publica `roles.role.created`
- `UpdateRoleCommand` → handler busca por id, actualiza descripción, guarda, publica `roles.role.updated`
- `DeleteRoleCommand` → handler verifica `!isSystem`, elimina, publica `roles.role.deleted`
- `AddPermissionCommand` → handler llama `role.addPermission()`, guarda, publica `roles.role.updated`
- `RemovePermissionCommand` → handler llama `role.removePermission()`, guarda, publica `roles.role.updated`

**CQRS Queries** (crear en `src/application/queries/`):
- `GetRoleQuery` → handler busca por id, retorna DTO
- `GetRolesQuery` → handler retorna todos los roles como array de DTOs
- `GetRolePermissionsQuery` → handler retorna solo el array de permisos del rol

**Controller** (`roles.controller.ts`) — endpoints exactos del design §4.3.3:
- Todos los endpoints requieren `JwtAuthGuard` (misma guard que en auth-service)
- `DELETE /roles/:id` verifica que el rol no tenga `isSystem=true` antes de ejecutar el command

**Seed** (`src/infrastructure/seeds/roles.seed.ts`):
```typescript
const SYSTEM_ROLES = [
  {
    name: 'SUPER_ADMIN',
    description: 'Acceso completo al sistema',
    permissions: ['users:read','users:write','users:delete','roles:read','roles:write','roles:delete','audit:read','ai:admin'],
    isSystem: true,
  },
  {
    name: 'ADMIN',
    description: 'Administrador del sistema',
    permissions: ['users:read','users:write','users:delete','roles:read','audit:read'],
    isSystem: true,
  },
  {
    name: 'USER',
    description: 'Usuario estándar',
    permissions: ['users:read'],
    isSystem: true,
  },
  {
    name: 'AUDITOR',
    description: 'Auditor del sistema',
    permissions: ['audit:read','users:read'],
    isSystem: true,
  },
];
```
Llamar `seedRoles()` desde `main.ts` antes de `app.listen()`.

**Health endpoint**: `GET /health` verifica PostgreSQL y RabbitMQ.

**Dockerfile**: idéntico al de auth-service, cambiando puerto a `3003`.

**Tests unitarios** (≥70% coverage): cubrir todos los command handlers y el seed.

**Criterios de aceptación**:
- [x] Al arrancar, los 4 roles del sistema existen en `roles_db`
- [x] `DELETE /roles/:id` de un role con `isSystem=true` retorna HTTP 409
- [x] `GET /roles` retorna array con los 4 roles del seed
- [x] Todos los endpoints protegidos sin JWT retornan 401

→ Depende de: TASK-015

---

## FASE 4 — User Service

### TASK-017 · User Service — Inicialización y Domain Layer `P0` ✅

Inicializar NestJS con `PORT=3002`, `DB_NAME=users_db`. Mismas dependencias que Role Service más `opossum` (circuit breaker).

**`.env`**:
```bash
PORT=3002
DB_HOST=postgres
DB_PORT=5432
DB_NAME=users_db
DB_USER=${POSTGRES_USER}
DB_PASSWORD=${POSTGRES_PASSWORD}
RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
JWT_SECRET=${JWT_SECRET}
ROLE_SERVICE_URL=http://role-service:3003
LOG_LEVEL=${LOG_LEVEL}
```

**Domain Layer**:

**`value-objects/full-name.vo.ts`**: nombre + apellido separados, no vacíos, max 100 chars total.
**`value-objects/email.vo.ts`**: idéntico al de auth-service (duplicar, NO importar del otro servicio).
**`value-objects/user-status.vo.ts`**: enum `UserStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }`.

**`entities/user.entity.ts`** — Aggregate Root con todos los campos del design §4.2.1:
- `assignRole(roleId: string)`: añade a `roleIds` si no existe, emite `UserRoleAssignedEvent`
- `removeRole(roleId: string)`: elimina de `roleIds`, lanza error si no existía
- `deactivate()`: `status = INACTIVE`
- `activate()`: `status = ACTIVE`
- `update(name, email)`: actualiza campos, emite `UserUpdatedEvent` con `changes` array

**Events**: `UserCreatedEvent`, `UserUpdatedEvent`, `UserDeletedEvent`, `UserRoleAssignedEvent`, `UserRoleRemovedEvent`.

**Repository Interface** `IUserRepository` con métodos del design §4.2.1.

**Criterios de aceptación**:
- [x] `user.assignRole('role-uuid')` dos veces no duplica el roleId
- [x] `user.removeRole('nonexistent')` lanza error
- [x] El módulo de dominio no tiene dependencias de `@nestjs/*` ni librerías externas

→ Depende de: TASK-001

---

### TASK-018 · User Service — Infrastructure, Circuit Breaker, CQRS y Controller `P0` ✅

**TypeORM Entity** (`user.typeorm-entity.ts`):
```typescript
@Entity('users')
export class UserTypeormEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() firstName: string;
  @Column() lastName: string;
  @Column({ unique: true }) email: string;
  @Column({ default: 'ACTIVE' }) status: string;
  @Column('simple-array', { default: '' }) roleIds: string[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

**`infrastructure/http-clients/role-service.client.ts`**

Clase `RoleServiceClient` con:
- `roleExists(roleId: string): Promise<boolean>` — `GET {ROLE_SERVICE_URL}/roles/{roleId}`
- Timeout: 3 segundos (axios `timeout: 3000`)
- Circuit breaker con `opossum`:
  ```typescript
  const breaker = new CircuitBreaker(this.fetchRole.bind(this), {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  });
  breaker.fallback(() => { throw new ServiceUnavailableException('Role Service unavailable'); });
  ```
- Loguea `warn` cuando el circuit breaker se abre

**CQRS Commands**:
- `CreateUserCommand` → handler: verifica email único → valida roleIds existentes vía `RoleServiceClient` → crea `User` → guarda → publica `users.user.created`
- `UpdateUserCommand` → handler: busca user → actualiza → guarda → publica `users.user.updated` con array `changes`
- `DeleteUserCommand` → handler: busca user → elimina → publica `users.user.deleted`
- `AssignRoleCommand` → handler: busca user → llama `RoleServiceClient.roleExists()` → `user.assignRole()` → guarda → publica `users.user.role.assigned`
- `RemoveRoleCommand` → handler: busca user → `user.removeRole()` → guarda → publica `users.user.role.removed`

**CQRS Queries**:
- `GetUserQuery` → busca por id, retorna DTO, lanza `NotFoundException` si no existe
- `GetUsersQuery` → soporta `{ page: number, limit: number, status?: string, email?: string }`, retorna `{ items, total, page, limit }`
- `GetUserRolesQuery` → obtiene roleIds del user → llama `GET /roles` en Role Service → filtra los que coinciden → retorna array de roles

**Controller** (`users.controller.ts`) — endpoints exactos del design §4.2.3 con sus permisos.

**`PermissionsGuard`**: verifica que `req.user.permissions` incluya el permiso declarado en `@RequirePermissions('users:write')`.

**Criterios de aceptación**:
- [x] `POST /users` con `roleIds` de un rol inexistente retorna 503 si Role Service está caído
- [x] `GET /users?page=1&limit=10` retorna estructura paginada
- [x] Circuit breaker loguea `warn` al abrirse
- [x] `DELETE /users/:id` publica evento `users.user.deleted`

→ Depende de: TASK-017

---

### TASK-019 · User Service — Tests, Health y Dockerfile `P1` ✅

**Tests unitarios** (`test/unit/`) cubriendo:
- `user.entity.spec.ts`: todos los métodos del aggregate
- `create-user.handler.spec.ts`: caso éxito, email duplicado, roleId inválido, Role Service caído
- `assign-role.handler.spec.ts`: caso éxito, rol no existe, Role Service caído

**Health endpoint**: `GET /health` verifica PostgreSQL y RabbitMQ.

**Dockerfile**: idéntico al de auth-service, puerto `3002`.

**Criterios de aceptación**:
- [x] Coverage ≥ 70%
- [x] Tests mockean `IUserRepository` y `RoleServiceClient` — no hacen llamadas HTTP reales

→ Depende de: TASK-018

---

## FASE 5 — Audit Service

### TASK-020 · Audit Service — Inicialización, Schema Mongoose y Consumer `P0` ✅

Inicializar NestJS con `PORT=3005`. Dependencias: `@nestjs/mongoose`, `mongoose`, `@nestjs/microservices`, `amqplib`, `amqp-connection-manager`, `nest-winston`, `winston`.

**`.env`**:
```bash
PORT=3005
MONGO_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/audit_db?authSource=admin
RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
JWT_SECRET=${JWT_SECRET}
LOG_LEVEL=${LOG_LEVEL}
```

**`src/domain/schemas/audit-log.schema.ts`**

Schema Mongoose con todos los campos exactos del design §4.4.2:
```typescript
@Schema({ timestamps: false, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true }) eventType: string;
  @Prop({ required: true }) service: string;
  @Prop({ default: null }) userId: string | null;
  @Prop({ default: null }) actorEmail: string | null;
  @Prop({ required: true }) resourceType: string;
  @Prop({ default: null }) resourceId: string | null;
  @Prop({ required: true }) action: string;
  @Prop({ enum: ['success', 'failure'], required: true }) status: string;
  @Prop({ type: Object, default: {} }) metadata: Record<string, unknown>;
  @Prop({ required: true }) correlationId: string;
  @Prop({ required: true }) eventId: string;   // para idempotencia
  @Prop({ required: true }) timestamp: Date;
}
```

Índices definidos en el schema (design §4.4.2):
```typescript
@Schema()
@Index({ timestamp: -1 })
@Index({ userId: 1, timestamp: -1 })
@Index({ eventType: 1, timestamp: -1 })
@Index({ service: 1, timestamp: -1 })
@Index({ eventId: 1 }, { unique: true })  // garantiza idempotencia
```

**`src/infrastructure/messaging/audit-event.consumer.ts`**

Microservicio NestJS que consume de RabbitMQ:
- Conectar al exchange `toka.events` (topic, durable)
- Queue: `audit.events.queue` (durable)
- Binding: routing key `#`
- Dead-letter exchange: `toka.dlx` (direct)
- Dead-letter queue: `audit.dlq`
- Prefetch: 10

Para cada mensaje recibido:
1. Extraer `eventId` del mensaje
2. Verificar si ya existe un `AuditLog` con ese `eventId` (idempotencia) — si existe, ACK y retornar
3. Mapear evento a campos de `AuditLog` según la tabla:

| eventType | service | resourceType | action | status |
|---|---|---|---|---|
| `auth.user.registered` | `auth-service` | `user` | `register` | `success` |
| `auth.user.login.success` | `auth-service` | `session` | `login` | `success` |
| `auth.user.login.failed` | `auth-service` | `session` | `login` | `failure` |
| `auth.user.logout` | `auth-service` | `session` | `logout` | `success` |
| `users.user.created` | `user-service` | `user` | `create` | `success` |
| `users.user.updated` | `user-service` | `user` | `update` | `success` |
| `users.user.deleted` | `user-service` | `user` | `delete` | `success` |
| `users.user.role.assigned` | `user-service` | `user` | `assign_role` | `success` |
| `users.user.role.removed` | `user-service` | `user` | `remove_role` | `success` |
| `roles.role.created` | `role-service` | `role` | `create` | `success` |
| `roles.role.updated` | `role-service` | `role` | `update` | `success` |
| `roles.role.deleted` | `role-service` | `role` | `delete` | `success` |

4. Guardar `AuditLog` en MongoDB
5. En caso de error al guardar: loguear `error` y **no** ACK (RabbitMQ reintentará)
6. Tras 3 reintentos fallidos: el mensaje pasa automáticamente a `audit.dlq`

**Criterios de aceptación**:
- [x] El índice único en `eventId` garantiza que el mismo evento no se persiste dos veces
- [x] Los 12 tipos de eventos del sistema se mapean correctamente
- [x] Un mensaje malformado no crashea el consumer (catch con log y NACK)

→ Depende de: TASK-001

---

### TASK-021 · Audit Service — Controller, Health, Tests y Dockerfile `P1` ✅

**`src/infrastructure/http/controllers/audit.controller.ts`**

Endpoints del design §4.4.3 (todos con `@UseGuards(JwtAuthGuard)` + `@RequirePermissions('audit:read')`):

- `GET /audit/logs` — query params: `page`, `limit`, `startDate`, `endDate`, `userId`, `eventType`, `service`, `status`
  - Construir query MongoDB dinámicamente con los filtros presentes
  - Retornar `{ items: AuditLog[], total: number, page: number, limit: number }`
- `GET /audit/logs/:id` — buscar por `_id`, lanzar `NotFoundException` si no existe
- `GET /audit/logs/user/:userId` — filtrar por `userId`, ordenar por `timestamp -1`, paginar
- `GET /audit/logs/stats` — agregar: total de eventos por `eventType` en los últimos 7 días

**Tests** (`test/unit/`):
- `audit-event.consumer.spec.ts`: idempotencia (mismo eventId), mapeo de cada tipo de evento, manejo de mensaje malformado

**Health**: `GET /health` verifica MongoDB y RabbitMQ.

**Dockerfile**: idéntico, puerto `3005`.

**Criterios de aceptación**:
- [x] `GET /audit/logs?userId=uuid` retorna solo logs de ese usuario
- [x] `GET /audit/logs/stats` retorna conteo por tipo en los últimos 7 días
- [x] Coverage ≥ 70%

→ Depende de: TASK-020

---

## FASE 6 — AI Service

### TASK-022 · AI Service — Inicialización y documentos de conocimiento `P0` ✅

Inicializar NestJS con `PORT=3004`. Dependencias:
```bash
npm install @langchain/openai @langchain/qdrant langchain
npm install @qdrant/js-client-rest axios uuid
npm install class-validator class-transformer @nestjs/config nest-winston winston
npm install typeorm pg   # para persistir métricas
```

**`.env`**:
```bash
PORT=3004
OPENAI_API_KEY=${OPENAI_API_KEY}
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=system_knowledge
USER_SERVICE_URL=http://user-service:3002
JWT_SECRET=${JWT_SECRET}
DB_HOST=postgres
DB_PORT=5432
DB_NAME=users_db
DB_USER=${POSTGRES_USER}
DB_PASSWORD=${POSTGRES_PASSWORD}
LOG_LEVEL=${LOG_LEVEL}
```

**Documentos a crear en `src/docs/`**:

**`user-management-guide.md`** (mínimo 500 palabras):
- Cómo crear, editar y eliminar usuarios
- Proceso de asignación de roles
- Estados de usuario (ACTIVE/INACTIVE) y sus implicaciones
- Cómo consultar el historial de un usuario

**`roles-permissions-reference.md`** (mínimo 500 palabras):
- Descripción de cada rol: SUPER_ADMIN, ADMIN, USER, AUDITOR
- Lista completa de permisos disponibles: `users:read`, `users:write`, `users:delete`, `roles:read`, `roles:write`, `roles:delete`, `audit:read`, `ai:admin`
- Qué puede hacer cada rol
- Proceso de creación de roles personalizados

**`system-overview.md`** (mínimo 300 palabras):
- Descripción general del sistema
- Listado de microservicios y su función
- Flujos principales (login, gestión de usuarios, auditoría)
- Preguntas frecuentes sobre el sistema

**Criterios de aceptación**:
- [x] Los 3 archivos `.md` existen en `src/docs/` con el contenido mínimo especificado
- [x] El contenido es coherente con el sistema implementado (no genérico)

→ Depende de: TASK-001

---

### TASK-023 · AI Service — Pipeline de indexación (Embeddings → Qdrant) `P0` ✅

**`src/infrastructure/langchain/qdrant-vector-store.ts`**

Singleton que provee `QdrantVectorStore`:
```typescript
export async function createVectorStore(config: ConfigService): Promise<QdrantVectorStore> {
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    openAIApiKey: config.get('OPENAI_API_KEY'),
  });
  return QdrantVectorStore.fromExistingCollection(embeddings, {
    url: config.get('QDRANT_URL'),
    collectionName: config.get('QDRANT_COLLECTION'),
  });
}
```

**`src/application/use-cases/index-documents.use-case.ts`**

Clase `IndexDocumentsUseCase` con método `execute(): Promise<void>`:
1. Verificar si la colección `system_knowledge` existe en Qdrant; si existe y tiene vectores, saltar (no re-indexar en cada arranque)
2. Leer los 3 archivos `.md` de `src/docs/`
3. Para cada documento:
   a. Crear `Document` de LangChain con metadata `{ source: 'filename.md' }`
   b. Dividir con `TokenTextSplitter({ chunkSize: 500, chunkOverlap: 50 })`
4. Generar embeddings para todos los chunks (batch, no uno por uno)
5. Almacenar en Qdrant collection `system_knowledge` con payload:
   ```json
   { "content": "...", "source": "filename.md", "chunkIndex": 0 }
   ```
6. Loguear `info` con `action: 'indexing.completed'`, `chunksIndexed`, `documentsProcessed`

Llamar `IndexDocumentsUseCase.execute()` en el `onModuleInit()` del módulo principal del AI Service.

**`POST /ai/index`** (requiere permiso `ai:admin`): llama `IndexDocumentsUseCase.execute()` forzando re-indexación.

**Criterios de aceptación**:
- [x] Al arrancar el servicio por primera vez, Qdrant contiene vectores de los 3 documentos
- [x] Al arrancar por segunda vez, NO re-indexa (evita costos innecesarios de embeddings)
- [x] `POST /ai/index` fuerza re-indexación completa

→ Depende de: TASK-022

---

### TASK-024 · AI Service — Pipeline RAG (QueryAgent Use Case) `P0` ✅

**`src/infrastructure/langchain/metrics-callback.ts`**

Clase `MetricsCallback extends BaseCallbackHandler` que captura:
- `handleLLMStart`: registra timestamp de inicio
- `handleLLMEnd(output)`: calcula `llmLatencyMs`, extrae `promptTokens` y `completionTokens` de `output.llmOutput.tokenUsage`

**`src/domain/services/cost-calculator.service.ts`**

Método `calculate(inputTokens, outputTokens): number`:
```typescript
return (inputTokens / 1_000_000 * 0.15) + (outputTokens / 1_000_000 * 0.60);
```

**`src/domain/services/response-validator.service.ts`**

Método `validate(answer: string, avgChunkScore: number, chunksRetrieved: number): string[]`:
- Retorna array de quality flags: `'empty_response'`, `'too_short'`, `'max_tokens_reached'`, `'low_retrieval_score'`, `'no_context_found'`
- Lógica exacta del design §4.5.5

**`src/infrastructure/http-clients/user-service.client.ts`**

Clase `UserServiceClient`:
- `getUserById(userId: string): Promise<UserDTO | null>` — `GET {USER_SERVICE_URL}/users/{userId}`, timeout 3s
- Retorna `null` si el usuario no existe o si el servicio no responde (no debe fallar el pipeline RAG)

**`src/application/use-cases/query-agent.use-case.ts`**

Clase `QueryAgentUseCase` con método `execute(request: AIQueryRequest): Promise<AIQueryResponse>`:

Implementar EXACTAMENTE el pipeline del design §4.5.2:
1. Registrar `startTime = Date.now()`
2. Generar embedding de `request.query` — registrar `embeddingLatencyMs`
3. Buscar en Qdrant: `topK=5`, `scoreThreshold=0.7` — registrar `retrievalLatencyMs`
4. Si `request.userId` existe: llamar `UserServiceClient.getUserById()` — no fallar si retorna null
5. Construir prompt (ver TASK-025 para el contenido exacto)
6. Llamar GPT-4o-mini con `MetricsCallback` — `maxTokens: 800`, `temperature: 0.3`
7. Calcular `totalLatencyMs = Date.now() - startTime`
8. Llamar `CostCalculatorService.calculate()`
9. Llamar `ResponseValidatorService.validate()`
10. Generar `queryId = uuid()`
11. Persistir métricas en PostgreSQL (`QueryMetric` entity)
12. Loguear `info` con todas las métricas (design §12.5)
13. Retornar `AIQueryResponse` con exactamente los campos del design §4.5.3

En caso de error de OpenAI:
- Si `error.status === 429` (rate limit): loguear `error` con `reason: 'rate_limit_exceeded'` y `retryAfterMs`; retornar HTTP 503
- Si timeout: retornar HTTP 503
- NO propagar el error crudo al cliente

**Criterios de aceptación**:
- [x] La respuesta siempre incluye `queryId`, `answer`, `sources`, `metrics`
- [x] Las métricas incluyen todos los campos del design §4.5.4
- [x] Un error 429 de OpenAI retorna 503 al cliente con mensaje descriptivo
- [x] Si `userId` no existe en User Service, el pipeline continúa sin datos de usuario

→ Depende de: TASK-023

---

### TASK-025 · AI Service — Prompt Engineering y Controller `P0` ✅

**`src/application/prompts/system.prompt.ts`**

Constante `SYSTEM_PROMPT` con el texto EXACTO del design §10.1:
```typescript
export const SYSTEM_PROMPT = `Eres un asistente especializado en el sistema de gestión de usuarios de Toka.
Tu función es responder preguntas sobre usuarios, roles, permisos y eventos de auditoría.

REGLAS:
1. Responde SOLO con información que esté en el contexto proporcionado o en los datos del sistema.
2. Si no tienes suficiente información para responder con certeza, dilo explícitamente.
3. No inventes IDs, emails, fechas ni datos de usuarios.
4. Responde en el mismo idioma en que se te hace la pregunta.
5. Si la pregunta es sobre datos en vivo de un usuario específico, usa los datos del contexto de usuario.
6. Mantén un tono profesional y conciso.
7. Si la pregunta está fuera del dominio del sistema, declínala educadamente.`;
```

**`src/application/prompts/prompt-builder.ts`**

Clase `PromptBuilder` con método `build(query, contextChunks, userData?)`:
- Construye prompt con estructura: `SYSTEM_PROMPT + CONTEXTO + (DATOS_USUARIO si disponible) + PREGUNTA`
- Few-shot examples incluidos en el system prompt (ver design §10.2)
- Para preguntas que contengan palabras como "por qué" o "analiza": incluir el chain-of-thought del design §10.3

**`src/infrastructure/http/dtos/ai-query.dto.ts`**:
```typescript
export class AIQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  query: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
```

**`src/infrastructure/http/controllers/ai.controller.ts`**

Endpoints del design §4.5.3:
- `POST /ai/query` → `QueryAgentUseCase.execute()` → HTTP 200
- `POST /ai/index` → `IndexDocumentsUseCase.execute()` [requiere `ai:admin`] → HTTP 202
- `GET /ai/metrics` → retorna últimas 100 métricas de PostgreSQL
- `GET /ai/metrics/:queryId` → retorna métrica específica o 404
- `GET /ai/health` → verifica Qdrant (`GET {QDRANT_URL}/health`) y OpenAI (`GET https://api.openai.com/v1/models` con API key)

**`QueryMetric` TypeORM entity** (`src/infrastructure/persistence/typeorm/entities/query-metric.entity.ts`):
Columnas exactas del `QueryMetrics` interface del design §4.5.4.

**Tests unitarios**: cubrir `QueryAgentUseCase` mockeando `VectorStore`, `ChatOpenAI`, `UserServiceClient`. Cubrir `ResponseValidatorService` con todos los flags. Cubrir `CostCalculatorService`.

**Dockerfile**: puerto `3004`.

**Criterios de aceptación**:
- [x] `POST /ai/query` con query válida retorna respuesta con `queryId` y `metrics`
- [x] `GET /ai/metrics/:queryId` retorna la métrica de la consulta anterior
- [x] `GET /ai/health` verifica explícitamente Qdrant y OpenAI
- [x] Coverage ≥ 70%

→ Depende de: TASK-024

---

## FASE 7 — BFF

### TASK-026 · BFF — Inicialización, Middleware y Guards `P0` ✅

Inicializar NestJS con `PORT=3000`. Dependencias: `axios`, `@nestjs/jwt`, `passport-jwt`, `@nestjs/throttler`, `helmet`, `uuid`.

**`.env`**:
```bash
PORT=3000
JWT_SECRET=${JWT_SECRET}
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
ROLE_SERVICE_URL=http://role-service:3003
AUDIT_SERVICE_URL=http://audit-service:3005
AI_SERVICE_URL=http://ai-service:3004
LOG_LEVEL=${LOG_LEVEL}
```

**`src/middleware/correlation-id.middleware.ts`**

Implementa `NestMiddleware`:
- Si `req.headers['x-correlation-id']` existe: usarlo
- Si no: generar `uuid()` y asignarlo a `req.headers['x-correlation-id']`
- Siempre setear `res.setHeader('X-Correlation-Id', correlationId)`
- Aplicar globalmente a todas las rutas en `AppModule`

**`src/guards/jwt-auth.guard.ts`** (igual al de otros servicios):
- Verifica firma JWT localmente con `JwtService.verify()`
- No llama a ningún servicio externo para validar
- Extrae y coloca `req.user` con payload decodificado

**`src/filters/global-exception.filter.ts`**

`ExceptionFilter` global que captura todas las excepciones y retorna SIEMPRE el formato:
```typescript
{
  statusCode: number,
  error: string,
  message: string,
  correlationId: string,       // de req.headers['x-correlation-id']
  timestamp: string,           // ISO-8601
}
```

**Seguridad** en `main.ts`:
```typescript
app.use(helmet());
app.enableCors({ origin: 'http://localhost', methods: ['GET','POST','PUT','DELETE','PATCH'] });
app.useGlobalFilters(new GlobalExceptionFilter());
```

**Rate limiting** (`ThrottlerModule` en `AppModule`):
- Global: 100 requests por minuto por IP
- Ruta `/api/auth/login`: 10 requests por minuto (aplicar `@Throttle({ default: { limit: 10, ttl: 60000 } })`)

**Criterios de aceptación**:
- [x] Toda respuesta de error tiene `correlationId` y `timestamp`
- [x] `X-Correlation-Id` está presente en todas las respuestas
- [x] 11 requests a `/api/auth/login` en 1 minuto → el último retorna HTTP 429

→ Depende de: TASK-001

---

### TASK-027 · BFF — Proxy a microservicios, Health y Dockerfile `P0` ✅

**`src/proxy/proxy.service.ts`**

Clase `ProxyService` con método genérico:
```typescript
async forward(
  method: 'GET'|'POST'|'PUT'|'DELETE',
  targetUrl: string,
  req: Request,
  body?: unknown,
): Promise<unknown>
```
- Propaga headers: `Authorization`, `X-Correlation-Id`, `X-User-Id`, `X-User-Roles`, `X-Request-Timestamp`
- Timeout por defecto: 10s (excepto rutas `/ai/*`: 35s)
- En caso de error del microservicio: propaga el mismo `statusCode` y `message`
- En caso de timeout: retorna HTTP 504 Gateway Timeout

**Controladores de proxy** (uno por microservicio):

**`src/proxy/auth-proxy.controller.ts`**
- `POST /api/auth/register` → sin JWT guard → forward a `AUTH_SERVICE_URL/auth/register`
- `POST /api/auth/login` → sin JWT guard → forward a `AUTH_SERVICE_URL/auth/login`
- `POST /api/auth/logout` → **con** `JwtAuthGuard` → forward
- `POST /api/auth/refresh` → sin JWT guard → forward

**`src/proxy/users-proxy.controller.ts`**
- Todas las rutas `/api/users/*` → **con** `JwtAuthGuard` → forward a `USER_SERVICE_URL`
- Inyecta `X-User-Id` y `X-User-Roles` en headers antes de forward

**`src/proxy/roles-proxy.controller.ts`**
- Todas las rutas `/api/roles/*` → **con** `JwtAuthGuard` → forward

**`src/proxy/audit-proxy.controller.ts`**
- Todas las rutas `/api/audit/*` → **con** `JwtAuthGuard` → forward

**`src/proxy/ai-proxy.controller.ts`**
- Todas las rutas `/api/ai/*` → **con** `JwtAuthGuard` → forward (timeout 35s)

**Health**: `GET /health` verifica que los 5 microservicios responden en `GET /health` con status `ok`.

**Dockerfile**: multi-stage, puerto `3000`.

**Criterios de aceptación**:
- [x] `POST /api/auth/login` sin JWT retorna la respuesta del Auth Service (no da 401)
- [x] `GET /api/users` sin JWT retorna 401 (del BFF, antes de llegar al User Service)
- [x] El header `X-User-Id` llega al User Service en cada request autenticado
- [x] Un timeout de microservicio retorna 504, no 500

→ Depende de: TASK-026

---

## FASE 8 — Frontend

### TASK-028 · Frontend — Inicialización, estructura y dependencias `P0` ✅

Dentro de `frontend/`, ejecutar:
```bash
npm create vite@latest . -- --template react-ts
```

Instalar dependencias exactas:
```bash
npm install @reduxjs/toolkit react-redux redux-persist
npm install react-router-dom axios
npm install react-hook-form @hookform/resolvers zod
npm install react-hot-toast
npm install -D @types/react @types/react-dom
```

Dependencias de testing:
```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D jest jest-environment-jsdom ts-jest msw
```

Crear la estructura de directorios exacta del design §8.1:
```
src/
├── app/
│   ├── store.ts
│   ├── hooks.ts
│   └── router.tsx
├── features/
│   ├── auth/
│   │   ├── authSlice.ts
│   │   ├── authApi.ts
│   │   ├── hooks/useAuth.ts
│   │   └── components/
│   │       ├── LoginForm.tsx
│   │       └── LogoutButton.tsx
│   ├── users/
│   │   ├── usersApi.ts
│   │   ├── hooks/useUsers.ts
│   │   └── components/
│   │       ├── UserList.tsx
│   │       ├── UserForm.tsx
│   │       ├── UserDetail.tsx
│   │       └── RoleAssignmentModal.tsx
│   ├── roles/
│   │   ├── rolesApi.ts
│   │   └── components/
│   │       ├── RoleList.tsx
│   │       ├── RoleForm.tsx
│   │       └── PermissionsEditor.tsx
│   ├── audit/
│   │   ├── auditApi.ts
│   │   └── components/
│   │       ├── AuditLogTable.tsx
│   │       └── AuditFilters.tsx
│   └── ai/
│       ├── aiApi.ts
│       └── components/
│           ├── AIAssistantChat.tsx
│           └── MetricsBadge.tsx
├── shared/
│   ├── components/
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── ProtectedRoute.tsx
│   ├── hooks/useToast.ts
│   └── utils/
│       ├── axiosInstance.ts
│       └── formatters.ts
└── pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx
    ├── UsersPage.tsx
    ├── UserDetailPage.tsx
    ├── RolesPage.tsx
    ├── AuditPage.tsx
    └── AIAssistantPage.tsx
```

**Criterios de aceptación**:
- [x] `npm run dev` arranca en puerto 5173 sin errores
- [x] `npm run build` compila sin errores TypeScript
- [x] Todos los directorios de la estructura existen

→ Depende de: TASK-001

---

### TASK-029 · Frontend — Redux Store, AuthSlice y Axios `P0` ✅

**`src/app/store.ts`**

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from '../features/auth/authSlice';
// RTK Query APIs se inyectan aquí

const authPersistConfig = { key: 'auth', storage, whitelist: ['user', 'accessToken', 'isAuthenticated'] };

export const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer),
    [usersApi.reducerPath]: usersApi.reducer,
    [rolesApi.reducerPath]: rolesApi.reducer,
    [auditApi.reducerPath]: auditApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
      .concat(usersApi.middleware, rolesApi.middleware, auditApi.middleware, aiApi.middleware, authApi.middleware),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**`src/app/hooks.ts`**: `useAppDispatch` y `useAppSelector` tipados con `RootState`.

**`src/features/auth/authSlice.ts`**

State shape exacto del design §8.2:
```typescript
interface AuthState {
  user: { id: string; email: string; roles: string[]; permissions: string[] } | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}
```
Reducers: `setCredentials(state, action)`, `clearCredentials(state)`.

**`src/shared/utils/axiosInstance.ts`**

Implementar EXACTAMENTE los interceptores del design §8.3:
- Request interceptor: inyecta `Authorization: Bearer {accessToken}` si existe en store
- Response interceptor: ante error 401 (y `!config._retry`), setea `_retry=true`, llama `POST /api/auth/refresh` con `refreshToken` del store, actualiza `accessToken` en store, reintenta la request original; si el refresh falla, llama `clearCredentials()` y redirige a `/login`

**Criterios de aceptación**:
- [x] Al hacer logout, `persistor.purge()` elimina el estado persistido en localStorage
- [x] El interceptor de response hace UN solo reintento automático al recibir 401
- [x] `useAppSelector(s => s.auth.isAuthenticated)` retorna `true` tras login exitoso

→ Depende de: TASK-028

---

### TASK-030 · Frontend — RTK Query APIs `P0` ✅

Crear cada API con `createApi` de RTK Query. Base URL de todas: `/api` (relativo, resuelto por Nginx al BFF).

**`src/features/auth/authApi.ts`**:
- `login(LoginDto)` → `POST /api/auth/login` → retorna `{ accessToken, refreshToken }`; en `onQueryStarted` exitoso: despacha `setCredentials()`
- `register(RegisterDto)` → `POST /api/auth/register`
- `logout()` → `POST /api/auth/logout`; en `onQueryStarted` exitoso: despacha `clearCredentials()`
- `refreshToken(refreshToken)` → `POST /api/auth/refresh`

**`src/features/users/usersApi.ts`**:
- `getUsers({ page, limit, status?, email? })` → `GET /api/users`
- `getUser(id)` → `GET /api/users/:id`
- `createUser(CreateUserDto)` → `POST /api/users`; invalida tag `User`
- `updateUser({ id, ...UpdateUserDto })` → `PUT /api/users/:id`; invalida tag `User`
- `deleteUser(id)` → `DELETE /api/users/:id`; invalida tag `User`
- `assignRole({ userId, roleId })` → `POST /api/users/:userId/roles`
- `removeRole({ userId, roleId })` → `DELETE /api/users/:userId/roles/:roleId`
- `getUserRoles(userId)` → `GET /api/users/:userId/roles`

**`src/features/roles/rolesApi.ts`**:
- `getRoles()` → `GET /api/roles`
- `getRole(id)` → `GET /api/roles/:id`
- `createRole(CreateRoleDto)` → `POST /api/roles`
- `updateRole({ id, ...UpdateRoleDto })` → `PUT /api/roles/:id`
- `deleteRole(id)` → `DELETE /api/roles/:id`
- `addPermission({ roleId, permission })` → `POST /api/roles/:roleId/permissions`
- `removePermission({ roleId, permission })` → `DELETE /api/roles/:roleId/permissions/:permission`

**`src/features/audit/auditApi.ts`**:
- `getAuditLogs({ page, limit, startDate?, endDate?, userId?, eventType?, service?, status? })` → `GET /api/audit/logs`
- `getAuditLog(id)` → `GET /api/audit/logs/:id`
- `getAuditStats()` → `GET /api/audit/logs/stats`

**`src/features/ai/aiApi.ts`**:
- `queryAI({ query, userId?, sessionId? })` → `POST /api/ai/query`
- `getAIMetrics()` → `GET /api/ai/metrics`

**Criterios de aceptación**:
- [x] Cada mutation invalida los tags correctos para forzar refetch
- [x] Los estados `isLoading`, `isError`, `data` están disponibles en cada hook generado
- [x] Las APIs no hardcodean URLs completas (solo paths relativos a `/api`)

→ Depende de: TASK-029

---

### TASK-031 · Frontend — Componentes de Auth y Shared `P0` ✅

**`src/features/auth/components/LoginForm.tsx`**

Formulario con `react-hook-form` + `zod`:
```typescript
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});
```
- Al submit: llama `useLoginMutation()`, muestra `<LoadingSpinner>` mientras `isLoading`, toast de error si falla
- Al éxito: navega a `/dashboard` con `useNavigate()`

**`src/shared/components/LoadingSpinner.tsx`**: spinner centrado, acepta prop `size?: 'sm'|'md'|'lg'`.

**`src/shared/components/ErrorMessage.tsx`**: muestra `message` en rojo con icono. Acepta prop `message: string`.

**`src/shared/components/ConfirmDialog.tsx`**: modal de confirmación con props `isOpen`, `title`, `message`, `onConfirm`, `onCancel`.

**`src/shared/components/ProtectedRoute.tsx`**:
```typescript
export function ProtectedRoute() {
  const { isAuthenticated } = useAppSelector(s => s.auth);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
```

**`src/app/router.tsx`**: estructura EXACTA del design §8.6:
```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/users" element={<UsersPage />} />
    <Route path="/users/:id" element={<UserDetailPage />} />
    <Route path="/roles" element={<RolesPage />} />
    <Route path="/audit" element={<AuditPage />} />
    <Route path="/ai" element={<AIAssistantPage />} />
  </Route>
</Routes>
```

**Criterios de aceptación**:
- [x] Navegar a `/users` sin autenticación redirige a `/login`
- [x] Login exitoso muestra toast de éxito y redirige a `/`
- [x] `<LoadingSpinner>` se muestra durante el login

→ Depende de: TASK-030

---

### TASK-032 · Frontend — Componentes de Users `P0` ✅

**`src/features/users/components/UserList.tsx`**
- Usa `useGetUsersQuery({ page, limit: 10 })`
- Mientras `isLoading`: muestra `<LoadingSpinner>`
- Si `isError`: muestra `<ErrorMessage message={error.data?.message}>`
- Muestra tabla con columnas: Nombre, Email, Estado, Roles, Acciones
- Paginación con botones anterior/siguiente
- Botón "Nuevo Usuario" → abre `<UserForm>` en modo creación
- Botón "Editar" → abre `<UserForm>` en modo edición
- Botón "Eliminar" → abre `<ConfirmDialog>` → llama `useDeleteUserMutation()`
- Toast de éxito/error tras cada operación

**`src/features/users/components/UserForm.tsx`**

Schema de validación con `zod`:
```typescript
const createUserSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email('Email inválido'),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .optional(),  // opcional en modo edición
  roleIds: z.array(z.string().uuid()).min(1, 'Seleccione al menos un rol'),
});
```
- Props: `mode: 'create'|'edit'`, `user?: UserDTO`, `onSuccess: () => void`
- Usa `useGetRolesQuery()` para poblar el selector de roles
- Muestra errores de validación debajo de cada campo
- Botón "Guardar" deshabilitado mientras `isLoading`

**`src/features/users/components/RoleAssignmentModal.tsx`**
- Modal que muestra roles disponibles como checkboxes
- Roles ya asignados aparecen marcados
- Al guardar: para cada rol añadido llama `useAssignRoleMutation()`, para cada rol quitado llama `useRemoveRoleMutation()`

**`src/features/users/components/UserDetail.tsx`**
- Muestra todos los campos del usuario
- Sección de roles asignados con botón para abrir `<RoleAssignmentModal>`

**Criterios de aceptación**:
- [x] El formulario no hace submit si hay errores de validación
- [x] `roleIds` vacío muestra error "Seleccione al menos un rol"
- [x] Eliminar usuario muestra `<ConfirmDialog>` antes de proceder
- [x] Toast de éxito aparece tras crear/editar/eliminar usuario

→ Depende de: TASK-031

---

### TASK-033 · Frontend — Componentes de Roles, Audit y AI `P0` ✅

**`src/features/roles/components/RoleList.tsx`**:
- Tabla con: Nombre, Descripción, Permisos (badge count), Sistema (sí/no), Acciones
- Roles con `isSystem=true` no tienen botón "Eliminar"
- CRUD completo con `<RoleForm>`

**`src/features/roles/components/RoleForm.tsx`**:
Schema zod: `name` (uppercase, sin espacios), `description`, `permissions` (array de strings con formato `resource:action`).

**`src/features/roles/components/PermissionsEditor.tsx`**:
- Lista de checkboxes con todos los permisos disponibles del sistema
- Permisos agrupados por recurso: `users:*`, `roles:*`, `audit:*`, `ai:*`

**`src/features/audit/components/AuditLogTable.tsx`**:
- Tabla con: Timestamp, Servicio, Tipo, Acción, Usuario, Estado
- Estado como badge de color: verde `success`, rojo `failure`
- `<AuditFilters>` encima de la tabla con campos: rango de fechas, userId, eventType, service, status
- Al aplicar filtros: llama `useGetAuditLogsQuery()` con los filtros activos

**`src/features/ai/components/AIAssistantChat.tsx`**:
- Input de texto (max 1000 chars con contador)
- Botón "Preguntar" → llama `useQueryAIMutation()`
- Mientras procesa: muestra `<LoadingSpinner>` con texto "El asistente está pensando..."
- Respuesta mostrada en card con:
  - Texto de la respuesta
  - `<MetricsBadge>` con latencia, tokens y costo
  - Lista de fuentes usadas (source + score)

**`src/features/ai/components/MetricsBadge.tsx`**:
- Badges pequeños: `{latencyMs}ms`, `{inputTokens + outputTokens} tokens`, `$${estimatedCostUSD.toFixed(6)}`

**Páginas** (`src/pages/`):
- `LoginPage.tsx`: solo renderiza `<LoginForm>` centrado en pantalla
- `DashboardPage.tsx`: resumen con contadores (total usuarios, roles, últimos eventos de auditoría)
- `UsersPage.tsx`: renderiza `<UserList>`
- `UserDetailPage.tsx`: renderiza `<UserDetail>` con el id de `useParams()`
- `RolesPage.tsx`: renderiza `<RoleList>`
- `AuditPage.tsx`: renderiza `<AuditLogTable>` con `<AuditFilters>`
- `AIAssistantPage.tsx`: renderiza `<AIAssistantChat>`

**Criterios de aceptación**:
- [x] `AuditFilters` con rango de fechas filtra los resultados de la tabla
- [x] El chat de IA muestra `MetricsBadge` con los valores reales de la respuesta
- [x] Roles del sistema no tienen botón "Eliminar"
- [x] `DashboardPage` muestra datos reales de los servicios

→ Depende de: TASK-031, TASK-032

---

### TASK-034 · Frontend — Tests, Dockerfile y nginx.conf `P1`

**Tests** en `src/__tests__/`:

**`features/auth/LoginForm.test.tsx`**:
- Render sin crashes
- Submit con email inválido → muestra error de validación
- Submit con campos vacíos → muestra errores
- Submit exitoso → llama mutation con datos correctos

**`features/users/UserList.test.tsx`**:
- Estado loading → muestra `<LoadingSpinner>`
- Estado error → muestra `<ErrorMessage>`
- Con datos → muestra filas en tabla
- Clic en "Eliminar" → muestra `<ConfirmDialog>`

**`features/auth/authSlice.test.ts`**:
- `setCredentials()` actualiza `user`, `accessToken`, `isAuthenticated`
- `clearCredentials()` limpia todos los campos

Usar MSW para mockear las APIs en los tests de componentes.

**`Dockerfile`** (design §8.7):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`nginx.conf`** (exacto del design §8.7):
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://bff:3000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 35s;
  }
}
```

**`jest.config.ts`** (frontend):
```typescript
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/src/setupTests.ts'],
  transform: { '^.+\\.(t|j)sx?$': 'ts-jest' },
  coverageThreshold: { global: { lines: 60 } },
};
```

**Criterios de aceptación**:
- [ ] `npm run test` pasa todos los tests
- [ ] `docker build -t frontend .` en `frontend/` completa sin errores
- [ ] El Dockerfile usa multi-stage (build + nginx)
- [ ] `nginx.conf` tiene fallback a `index.html` para rutas SPA

→ Depende de: TASK-033

---

## FASE 9 — Documentación (Ejercicio 4 y Entregables)

### TASK-035 · Documento de Diagnóstico Operacional `P1`

**Archivo**: `docs/incident-response.md`

Redactar respuesta completa al Ejercicio 4. El documento debe contener EXACTAMENTE las secciones del design §17:

1. **Escenario**: copiar el escenario exacto del PDF
2. **Hipótesis priorizadas**: tabla de las 8 hipótesis del design §17.1 con columnas: Prioridad, Hipótesis, Indicador en logs, Verificación
3. **Plan de diagnóstico paso a paso**: los 6 pasos del design §17.2 con comandos Docker exactos
4. **Acciones correctivas**: tabla del design §17.3
5. **Comunicación a stakeholders**: los 4 mensajes del design §17.4 con texto completo

**Criterios de aceptación**:
- [ ] Todas las hipótesis están ordenadas por prioridad con justificación
- [ ] Cada paso del diagnóstico incluye el comando exacto a ejecutar
- [ ] Los mensajes a stakeholders tienen variante técnica y de negocio
- [ ] El documento incluye los comandos de Docker Compose para verificar cada hipótesis

---

### TASK-036 · Runbook de ejecución del sistema `P1`

**Archivo**: `docs/runbook.md`

Contenido:
1. **Prerrequisitos**: Docker ≥ 24, Docker Compose ≥ 2.20, Node.js 20, OpenAI API key
2. **Configuración inicial**:
   ```bash
   cp .env.example .env
   # Editar .env con valores reales
   ```
3. **Levantar el sistema completo**:
   ```bash
   docker compose up --build
   ```
4. **Verificar que todos los servicios están saludables**:
   ```bash
   docker compose ps
   # Esperar hasta que todos muestren "healthy"
   ```
5. **Acceso a servicios**:
   - Frontend: `http://localhost`
   - RabbitMQ Management: `http://localhost:15672`
   - Qdrant Dashboard: `http://localhost:6333/dashboard`
6. **Credenciales del admin inicial**: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` del `.env`
7. **Ejecutar frontend en modo desarrollo** (sin Docker):
   ```bash
   cd frontend && npm install && npm run dev
   # Requiere que el BFF esté corriendo (docker compose up bff)
   ```
8. **Ejecutar tests de un microservicio**:
   ```bash
   cd services/auth-service && npm run test:cov
   ```
9. **Ver logs de un servicio**:
   ```bash
   docker compose logs -f auth-service
   ```
10. **Apagar el sistema**: `docker compose down` (agrega `-v` para eliminar volúmenes)

**Criterios de aceptación**:
- [ ] El runbook permite levantar el sistema desde cero siguiendo solo sus instrucciones
- [ ] Incluye comando para ejecutar frontend en modo dev aislado

---

### TASK-037 · Documentación de DDD y Clean Architecture `P1`

**Archivo**: `docs/architecture-decisions.md`

Secciones:
1. **Justificación de decisiones técnicas**: tabla completa del design §2 (cada tecnología con su justificación y alternativa descartada)
2. **Aplicación de DDD por servicio**: para cada uno de los 5 microservicios, describir qué elemento DDD se implementó:
   - Bounded Context
   - Aggregate Root y sus invariantes
   - Value Objects y sus validaciones
   - Domain Events publicados
   - Repository interfaces y sus implementaciones
3. **Aplicación de Clean Architecture**: diagrama textual de capas y regla de dependencia aplicada
4. **Aplicación de CQRS**: qué servicios usan CQRS y por qué, listado de Commands y Queries de cada uno
5. **Flujo de datos entre microservicios**: describir los 3 flujos del design §16 paso a paso

---

## FASE 10 — Verificación Final

### TASK-038 · Verificar levantamiento completo con Docker Compose `P0`

Ejecutar en la raíz del monorepo:
```bash
docker compose up --build
```

Verificar uno a uno:
- [ ] `docker compose ps` muestra los 12 servicios con estado `healthy`
- [ ] `curl http://localhost/` retorna la SPA React (HTML con `<div id="root">`)
- [ ] `curl http://localhost:3000/health` retorna `{"status":"ok",...}` con las 5 dependencias `ok`
- [ ] `curl http://localhost:3001/health` retorna `{"status":"ok","dependencies":{"database":"ok","redis":"ok","rabbitmq":"ok"}}`
- [ ] `curl http://localhost:3002/health` retorna status `ok`
- [ ] `curl http://localhost:3003/health` retorna status `ok`
- [ ] `curl http://localhost:3004/health` retorna status `ok` con Qdrant y OpenAI conectados
- [ ] `curl http://localhost:3005/health` retorna status `ok`
- [ ] RabbitMQ UI en `http://localhost:15672` accesible con credenciales del `.env`
- [ ] Qdrant en `http://localhost:6333/dashboard` muestra la colección `system_knowledge` con vectores

→ Depende de: todas las tasks de FASE 2 a 8

---

### TASK-039 · Verificar flujos E2E principales `P0`

Usando `curl` o Postman, ejecutar en orden:

**Flujo 1 — Registro y Login**:
```bash
# 1. Registrar usuario
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@toka.com","password":"Test1234!"}'
# Esperado: HTTP 201

# 2. Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@toka.com","password":"Test1234!"}'
# Esperado: HTTP 200 con accessToken y refreshToken

# 3. Guardar el accessToken de la respuesta anterior como $TOKEN
```

**Flujo 2 — CRUD de usuarios** (con `$TOKEN` del paso anterior):
```bash
# Crear usuario
curl -X POST http://localhost/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@test.com","password":"Test1234!","roleIds":["<ROLE_ID>"]}'

# Listar usuarios
curl http://localhost/api/users -H "Authorization: Bearer $TOKEN"

# Actualizar usuario
curl -X PUT http://localhost/api/users/<USER_ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@test.com"}'
```

**Flujo 3 — Verificar auditoría**:
```bash
curl http://localhost/api/audit/logs -H "Authorization: Bearer $TOKEN"
# Esperado: lista con eventos de login y creación de usuario
```

**Flujo 4 — Consulta al agente IA**:
```bash
curl -X POST http://localhost/api/ai/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"¿Qué permisos tiene el rol ADMIN?"}'
# Esperado: HTTP 200 con answer, sources y metrics
```

**Criterios de aceptación**:
- [ ] Todos los `curl` anteriores retornan los HTTP status esperados
- [ ] Los eventos de auditoría aparecen en `GET /api/audit/logs` dentro de 2 segundos del evento
- [ ] La respuesta del agente IA incluye `metrics.estimatedCostUSD` mayor que 0
- [ ] `GET /api/audit/logs/stats` retorna conteo de eventos del día

---

### TASK-040 · Ejecutar coverage reports de todos los microservicios `P1`

Para cada microservicio, ejecutar:
```bash
cd services/<service-name> && npm run test:cov
```

Verificar que el coverage report en `coverage/lcov-report/index.html` muestra:

| Servicio | Lines mínimo | Functions mínimo |
|---|---|---|
| auth-service | 70% | 70% |
| role-service | 70% | 70% |
| user-service | 70% | 70% |
| audit-service | 70% | 70% |
| ai-service | 70% | 70% |

**Criterios de aceptación**:
- [ ] `npm run test:cov` pasa (exit 0) en los 5 microservicios
- [ ] Ningún microservicio tiene coverage por debajo del umbral configurado en `jest.config.ts`
- [ ] Los reports HTML están generados en `services/<name>/coverage/lcov-report/index.html`

---

## Resumen de tareas por fase

| Fase | Tasks | Descripción |
|---|---|---|
| 0 — Setup | TASK-001 a 003 | Monorepo, .env, scripts |
| 1 — Infra | TASK-004 | Docker Compose completo |
| 2 — Auth Service | TASK-005 a 014 | Init, domain, infra, CQRS, controller, tests, Docker |
| 3 — Role Service | TASK-015 a 016 | Init, domain, infra, CQRS, seed, tests, Docker |
| 4 — User Service | TASK-017 a 019 | Init, domain, circuit breaker, CQRS, tests, Docker |
| 5 — Audit Service | TASK-020 a 021 | Init, schema, consumer, controller, tests, Docker |
| 6 — AI Service | TASK-022 a 025 | Init, docs, indexación, RAG, prompts, tests, Docker |
| 7 — BFF | TASK-026 a 027 | Init, middleware, guards, proxy, tests, Docker |
| 8 — Frontend | TASK-028 a 034 | Init, store, APIs, componentes, tests, Docker |
| 9 — Docs | TASK-035 a 037 | Diagnóstico, runbook, decisiones arquitectónicas |
| 10 — Verificación | TASK-038 a 040 | Docker Compose E2E, flujos, coverage |

**Total: 40 tareas** — cada una produce un artefacto verificable y concreto.
