# Guía de Gestión de Usuarios — Sistema Toka

## Introducción

El sistema de gestión de usuarios de Toka permite administrar el ciclo de vida completo de los usuarios de la plataforma: creación, actualización, asignación de roles, desactivación y eliminación. Todas las operaciones requieren autenticación JWT válida y los permisos correspondientes. Este documento describe los procedimientos y comportamientos del sistema.

---

## Creación de Usuarios

Para crear un usuario se utiliza el endpoint `POST /users`. Se requiere el permiso `users:write`.

**Campos obligatorios:**
- `firstName`: nombre del usuario (string, no vacío)
- `lastName`: apellido del usuario (string, no vacío)
- `email`: dirección de correo electrónico única en el sistema (formato válido, se normaliza a minúsculas)

**Campos opcionales:**
- `roleIds`: array de UUIDs de roles a asignar al crear el usuario. Cada roleId es validado contra el Role Service antes de persistir. Si el Role Service no está disponible, se retorna HTTP 503.

**Comportamiento:**
- El email debe ser único. Si ya existe un usuario con ese email, se retorna HTTP 409 (ConflictException).
- Al crearse, el usuario tiene estado `ACTIVE` por defecto.
- Se publica el evento `users.user.created` en RabbitMQ (exchange `toka.events`, routing key `users.user.created`).
- El Audit Service registra automáticamente la creación en MongoDB.

**Ejemplo de payload:**
```json
{
  "firstName": "María",
  "lastName": "González",
  "email": "maria.gonzalez@empresa.com",
  "roleIds": ["uuid-del-rol-user"]
}
```

**Respuesta exitosa:** HTTP 201 con el UUID del usuario creado.

---

## Actualización de Usuarios

Endpoint: `PUT /users/:id`. Requiere permiso `users:write`.

Se pueden actualizar `firstName`, `lastName` y `email`. Si el nuevo email ya pertenece a otro usuario, se retorna HTTP 409.

El sistema registra qué campos cambiaron en el evento `users.user.updated` con un array `changes` que contiene solo los campos modificados. Esto permite al Audit Service y a otros consumidores identificar exactamente qué datos cambiaron.

---

## Consulta de Usuarios

### Listar usuarios con paginación

Endpoint: `GET /users`. Requiere permiso `users:read`.

Parámetros de query disponibles:
- `page` (número, por defecto 1)
- `limit` (número, por defecto 10)
- `status` (ACTIVE | INACTIVE)
- `email` (búsqueda parcial por email)

Retorna estructura paginada:
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

### Obtener usuario por ID

Endpoint: `GET /users/:id`. Requiere permiso `users:read`. Retorna 404 si el usuario no existe.

### Consultar roles de un usuario

Endpoint: `GET /users/:id/roles`. Requiere permiso `users:read`. Retorna el array de `roleIds` asignados al usuario.

---

## Estados de Usuario: ACTIVE e INACTIVE

Los usuarios pueden tener dos estados:

**ACTIVE**: Estado por defecto al crear un usuario. El usuario puede autenticarse en el sistema (si tiene credenciales en el Auth Service) y tiene acceso a los recursos según sus permisos de rol.

**INACTIVE**: El usuario no puede autenticarse. Sus datos se conservan en el sistema para fines de auditoría e historial. El estado INACTIVE es útil cuando se desea suspender temporalmente el acceso sin eliminar el registro.

El estado se gestiona a través de los métodos `activate()` y `deactivate()` en la entidad de dominio `User`. Los cambios de estado se reflejan en la columna `status` de la tabla `users` en PostgreSQL (`users_db`).

> **Importante:** La desactivación de un usuario en el User Service no revoca automáticamente los tokens JWT activos. Los tokens existentes siguen siendo válidos hasta su expiración (15 minutos). El Auth Service gestiona la invalidación de tokens de forma independiente.

---

## Asignación y Remoción de Roles

### Asignar un rol

Endpoint: `POST /users/:id/roles`. Requiere permiso `users:write`.

Payload:
```json
{ "roleId": "uuid-del-rol" }
```

**Proceso:**
1. Se verifica que el usuario existe.
2. Se consulta el Role Service (`GET http://role-service:3003/roles/:roleId`) para validar que el rol existe. Timeout: 3 segundos. Si el Role Service está caído, el circuit breaker (opossum) lanza ServiceUnavailableException (HTTP 503).
3. Si el rol ya estaba asignado, la operación es idempotente (no duplica).
4. Se publica evento `users.user.role.assigned`.

### Remover un rol

Endpoint: `DELETE /users/:id/roles/:roleId`. Requiere permiso `users:write`.

Si el `roleId` no estaba asignado al usuario, retorna HTTP 404.

---

## Eliminación de Usuarios

Endpoint: `DELETE /users/:id`. Requiere permiso `users:delete`.

La eliminación es permanente (hard delete) de la base de datos PostgreSQL. Sin embargo, el historial de auditoría en MongoDB se conserva indefinidamente. Se publica el evento `users.user.deleted` que el Audit Service consume y registra.

---

## Consulta del Historial de un Usuario

Para ver el historial de acciones de un usuario específico, usar el Audit Service:

Endpoint: `GET /audit/logs/user/:userId`. Requiere permiso `audit:read`.

Este endpoint retorna todos los eventos de auditoría asociados al `userId`, ordenados por `timestamp` descendente. Incluye operaciones de login, cambios de perfil, asignaciones de roles y eliminación.

Para filtros más detallados, usar `GET /audit/logs?userId=<uuid>&eventType=<tipo>&startDate=<fecha>`.

---

## Validaciones del Dominio

La entidad `User` del servicio implementa las siguientes reglas:
- `FullName`: `firstName` y `lastName` no pueden estar vacíos; la combinación no puede superar 100 caracteres.
- `Email`: formato válido, normalizado a minúsculas, único en el sistema.
- `UserStatus`: solo puede ser `ACTIVE` o `INACTIVE`.
- Los `roleIds` son referencias a roles del Role Service; el User Service no valida la existencia de los roles en persistencia local, sino en el momento de la asignación.

---

## Eventos Publicados

| Operación | Routing Key RabbitMQ |
|---|---|
| Crear usuario | `users.user.created` |
| Actualizar usuario | `users.user.updated` |
| Eliminar usuario | `users.user.deleted` |
| Asignar rol | `users.user.role.assigned` |
| Remover rol | `users.user.role.removed` |

Todos los eventos se publican al exchange `toka.events` (tipo topic, durable) y son consumidos por el Audit Service para su registro en MongoDB.
