# Scripts

## Seed Inicial

Crea los datos mínimos necesarios para operar el sistema:
- Rol `admin`
- Usuario administrador inicial
- Credenciales de autenticación del administrador
- Asignación del rol admin al usuario administrador

### Prerrequisitos

- PostgreSQL ejecutándose (via `docker-compose up postgres`)
- Migraciones ejecutadas en los 3 schemas (auth, users, roles)
- Variables de entorno configuradas en `.env`

### Ejecución

```bash
npm run seed
```

### Credenciales de ejemplo (local)

| Campo | Valor |
|-------|-------|
| Username | admin |
| Password | admin123 |
| Email | admin@example.com |

### Login del administrador

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail": "admin", "password": "admin123"}'
```

El JWT resultante incluirá `roles: ["admin"]` y podrá usarse para operar todos los endpoints protegidos.

### Variables de entorno

```env
ADMIN_USER_ID=a0000000-0000-0000-0000-000000000001
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Administrator
```

### Idempotencia

El script es seguro para ejecutar múltiples veces. Si los datos ya existen, se omiten sin error.
