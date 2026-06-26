# Visión General del Sistema — Toka User Management

## Descripción General

El sistema de gestión de usuarios de Toka es una plataforma de microservicios que gestiona el ciclo de vida de usuarios, roles, permisos y auditoría. Está construido con NestJS y TypeScript bajo principios de Clean Architecture y Domain-Driven Design (DDD) con CQRS.

---

## Microservicios y sus Funciones

| Servicio | Puerto | Base de Datos | Función principal |
|---|---|---|---|
| **Auth Service** | 3001 | PostgreSQL (`auth_db`) | Autenticación: registro, login, logout, refresh y validación de JWT |
| **User Service** | 3002 | PostgreSQL (`users_db`) | CRUD de usuarios, asignación de roles, integración con Role Service |
| **Role Service** | 3003 | PostgreSQL (`roles_db`) | CRUD de roles y permisos, seed de roles del sistema |
| **AI Service** | 3004 | PostgreSQL + Qdrant | Agente de IA con RAG sobre documentación del sistema |
| **Audit Service** | 3005 | MongoDB (`audit_db`) | Consumidor RabbitMQ, registro inmutable de eventos del sistema |
| **BFF** | 3000 | — | Backend For Frontend: proxy, validación JWT, enrutamiento al frontend |

La comunicación entre servicios es una combinación de:
- **Síncrona (HTTP):** BFF → microservicios; User Service → Role Service (validar roles)
- **Asíncrona (RabbitMQ):** Todos los servicios publican eventos al exchange `toka.events`; el Audit Service los consume

---

## Flujo de Login

1. El cliente envía `POST /auth/login` con `{ email, password }`.
2. El Auth Service busca las credenciales en `auth_db` (PostgreSQL).
3. Se verifica la contraseña usando `bcrypt.compare`.
4. Si es válida: se genera un Access Token (JWT, 15 min) y un Refresh Token (UUID, 7 días almacenado en Redis).
5. El Access Token incluye: `{ sub: userId, email, roles: [...], permissions: [...], jti }`.
6. Se publica `auth.user.login.success` a RabbitMQ.
7. El cliente usa el Access Token en `Authorization: Bearer <token>` para todas las llamadas posteriores.

En caso de credenciales incorrectas: se publica `auth.user.login.failed` **antes** de retornar el error HTTP 401.

---

## Flujo de Gestión de Usuarios

1. El administrador (con permiso `users:write`) llama `POST /users` vía BFF.
2. El BFF valida el JWT y reenvía al User Service.
3. El User Service verifica que el email no exista.
4. Para cada `roleId` en el payload, consulta `GET /roles/:roleId` en el Role Service. Si el Role Service está caído, retorna 503.
5. Crea el usuario en `users_db` con estado `ACTIVE`.
6. Publica `users.user.created` a RabbitMQ.
7. El Audit Service consume el evento y persiste un `AuditLog` en MongoDB con `eventType: 'users.user.created'`, `action: 'create'`, `status: 'success'`.

---

## Flujo de Auditoría

El Audit Service opera completamente en modo asíncrono:

1. Recibe mensajes de `audit.events.queue` (binding `#` sobre exchange `toka.events`).
2. Verifica idempotencia por `eventId` (índice único en MongoDB).
3. Mapea el `eventType` al servicio origen, tipo de recurso, acción y estado.
4. Persiste en MongoDB con todos los campos de contexto.
5. En caso de error de persistencia: NACK con requeue. Tras 3 intentos, el mensaje pasa a `audit.dlq`.

---

## Preguntas Frecuentes

**¿Qué pasa si el Role Service está caído al crear un usuario?**
El User Service usa un circuit breaker (opossum) con timeout de 3 segundos. Si el Role Service no responde, retorna HTTP 503 al cliente. El circuit breaker se abre tras el 50% de fallos y se resetea a los 30 segundos.

**¿Puedo modificar un rol de sistema como ADMIN o USER?**
No. Los roles con `isSystem: true` (SUPER_ADMIN, ADMIN, USER, AUDITOR) no pueden ser renombrados ni eliminados. Se puede consultar sus permisos pero no modificarlos. El intento retorna HTTP 409.

**¿Cómo se invalida un token JWT?**
Al hacer logout (`POST /auth/logout`), el `jti` del Access Token se almacena en Redis con prefijo `token_blacklist:{jti}` con TTL igual al tiempo restante del token. El Refresh Token se elimina de Redis. Todos los servicios que usan el `JwtStrategy` verifican la firma del JWT pero solo el Auth Service verifica la blacklist.

**¿Dónde se almacenan los Refresh Tokens?**
En Redis con clave `refresh_token:{userId}:{tokenId}` y TTL de 7 días (604800 segundos).

**¿Qué base de datos usa el AI Service?**
Usa Qdrant como vector store para los embeddings de documentación del sistema (colección `system_knowledge`), y PostgreSQL para persistir métricas de consultas al agente de IA. El modelo de embeddings es `text-embedding-3-small` y el modelo de generación es `GPT-4o-mini`.

**¿Puedo ver el historial de cambios de un usuario?**
Sí. Usando `GET /audit/logs/user/:userId` (requiere permiso `audit:read`) se obtiene el historial completo de eventos asociados al usuario, incluyendo creación, actualizaciones, asignación de roles, y eventos de sesión (login/logout).
