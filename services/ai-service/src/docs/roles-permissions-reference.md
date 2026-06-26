# Referencia de Roles y Permisos — Sistema Toka

## Introducción

El sistema Toka implementa un modelo de control de acceso basado en roles (RBAC). Los permisos se verifican en cada microservicio mediante el `PermissionsGuard`, que inspecciona el campo `permissions` del payload del JWT. Los permisos son granulares y de formato `recurso:acción`.

---

## Roles del Sistema (System Roles)

El sistema define cuatro roles predefinidos marcados como `isSystem: true`. Estos roles **no pueden ser renombrados ni eliminados** — cualquier intento retorna HTTP 409 (ConflictException). Se crean automáticamente al arrancar el Role Service si no existen.

### SUPER_ADMIN

**Descripción:** Acceso completo al sistema. Destinado a administradores de infraestructura y devops.

**Permisos asignados:**
- `users:read` — consultar usuarios
- `users:write` — crear y actualizar usuarios
- `users:delete` — eliminar usuarios
- `roles:read` — consultar roles
- `roles:write` — crear y actualizar roles
- `roles:delete` — eliminar roles
- `audit:read` — consultar logs de auditoría
- `ai:admin` — forzar re-indexación del AI Service y acceder a métricas

**Capacidades:** Puede realizar cualquier operación en todos los microservicios. Es el único rol con permiso `roles:delete` y `ai:admin`.

---

### ADMIN

**Descripción:** Administrador del sistema. Puede gestionar usuarios y consultar roles, pero no puede modificar roles del sistema ni acceder a funciones de administración del AI Service.

**Permisos asignados:**
- `users:read`
- `users:write`
- `users:delete`
- `roles:read`
- `audit:read`

**Capacidades:** Gestión completa de usuarios (crear, actualizar, eliminar, asignar roles). Puede consultar el listado de roles disponibles. No puede crear ni modificar roles.

---

### USER

**Descripción:** Usuario estándar de la plataforma. Acceso de solo lectura a sus propios datos.

**Permisos asignados:**
- `users:read`

**Capacidades:** Puede consultar información de usuarios (incluyendo la propia). No puede crear, modificar ni eliminar usuarios. No puede acceder a logs de auditoría ni gestionar roles.

---

### AUDITOR

**Descripción:** Rol destinado a equipos de cumplimiento, compliance y seguridad. Tiene acceso de lectura a logs de auditoría y a información de usuarios, pero no puede modificar nada.

**Permisos asignados:**
- `audit:read`
- `users:read`

**Capacidades:** Puede consultar todos los logs de auditoría (`GET /audit/logs`, `GET /audit/logs/stats`, `GET /audit/logs/user/:userId`). Puede consultar información de usuarios para correlacionar con eventos de auditoría.

---

## Catálogo Completo de Permisos

Los permisos siguen el formato `recurso:acción`. El formato es validado por la clase `Permission` (Value Object) usando la regex `/^[a-z_]+:[a-z_*]+$/`.

| Permiso | Descripción | Endpoint que lo requiere |
|---|---|---|
| `users:read` | Consultar usuarios y sus roles | `GET /users`, `GET /users/:id`, `GET /users/:id/roles` |
| `users:write` | Crear y actualizar usuarios; asignar/remover roles | `POST /users`, `PUT /users/:id`, `POST /users/:id/roles`, `DELETE /users/:id/roles/:roleId` |
| `users:delete` | Eliminar usuarios permanentemente | `DELETE /users/:id` |
| `roles:read` | Consultar roles y sus permisos | `GET /roles`, `GET /roles/:id`, `GET /roles/:id/permissions` |
| `roles:write` | Crear roles, actualizar descripción, añadir/quitar permisos | `POST /roles`, `PUT /roles/:id`, `POST /roles/:id/permissions`, `DELETE /roles/:id/permissions/:perm` |
| `roles:delete` | Eliminar roles no-sistema | `DELETE /roles/:id` |
| `audit:read` | Consultar logs de auditoría y estadísticas | `GET /audit/logs*` |
| `ai:admin` | Forzar re-indexación y consultar métricas del AI Service | `POST /ai/index`, `GET /ai/metrics` |

---

## Cómo se Verifican los Permisos

El flujo de verificación es el siguiente:

1. El cliente envía el JWT en el header `Authorization: Bearer <token>`.
2. El `JwtStrategy` de cada servicio valida la firma del token contra `JWT_SECRET`.
3. El payload del JWT contiene `{ sub, email, roles, permissions, jti }`. El campo `permissions` es un array de strings con todos los permisos del usuario.
4. El `PermissionsGuard` (decorador `@RequirePermissions('permiso:accion')`) verifica que el array `permissions` del usuario contenga el permiso requerido.
5. Si el permiso no está presente, retorna HTTP 403 (ForbiddenException).

> **Nota:** Los permisos se incluyen en el JWT en el momento del login. Si se modifica el rol de un usuario, los cambios solo tienen efecto en el próximo login (cuando se emite un nuevo JWT).

---

## Creación de Roles Personalizados

Además de los roles del sistema, se pueden crear roles personalizados con cualquier combinación de permisos disponibles.

**Proceso:**

1. **Crear el rol:** `POST /roles` (requiere `roles:write`)
   ```json
   {
     "name": "SUPPORT_AGENT",
     "description": "Agente de soporte con acceso limitado",
     "isSystem": false
   }
   ```
   El nombre se convierte automáticamente a mayúsculas y no puede contener espacios.

2. **Añadir permisos:** `POST /roles/:id/permissions` (requiere `roles:write`)
   ```json
   { "permission": "users:read" }
   ```
   Se puede llamar múltiples veces para añadir diferentes permisos. No se duplican.

3. **Asignar a usuarios:** `POST /users/:id/roles` (requiere `users:write`)
   ```json
   { "roleId": "uuid-del-nuevo-rol" }
   ```

**Restricciones de nombres de roles:**
- Sin espacios (se valida con regex)
- Máximo 50 caracteres
- Se convierte a UPPERCASE automáticamente

---

## Gestión de Permisos de un Rol

### Consultar permisos

`GET /roles/:id/permissions` — retorna el array de permisos del rol.

### Añadir permiso

`POST /roles/:id/permissions` con `{ "permission": "recurso:accion" }`. Si el permiso ya existe en el rol, la operación es idempotente.

### Quitar permiso

`DELETE /roles/:id/permissions/:perm`. Si el permiso no estaba asignado, retorna HTTP 404.

> **Importante:** No se puede modificar los permisos de roles con `isSystem: true`. El intento retorna HTTP 409.

---

## Eventos de Auditoría Relacionados con Roles

| Evento | Cuándo ocurre |
|---|---|
| `roles.role.created` | Al crear un rol nuevo |
| `roles.role.updated` | Al cambiar descripción o permisos de un rol |
| `roles.role.deleted` | Al eliminar un rol no-sistema |

Todos estos eventos son registrados automáticamente por el Audit Service.
