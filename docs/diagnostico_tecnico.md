# Diagnóstico Técnico — Escenario de Fallo en Producción

## Contexto del Incidente

El sistema de gestión de usuarios está compuesto por 5 microservicios NestJS (Auth, User, Role, Audit, AI), un frontend React, y la siguiente infraestructura: PostgreSQL, MongoDB, Redis, RabbitMQ, Qdrant y OpenAI como proveedor LLM externo. Todos los componentes se ejecutan en contenedores Docker orquestados con Docker Compose.

## Síntomas Reportados

1. Los usuarios **no pueden guardar registros** (crear/actualizar usuarios o roles).
2. Algunos microservicios responden con **errores HTTP 500** de forma intermitente.
3. El módulo de IA presenta **alta latencia** en las respuestas.
4. Posibles síntomas derivados:
   - Timeouts entre microservicios.
   - Eventos de auditoría no visibles o retrasados.
   - Errores en resolución de roles durante login.
   - Frontend mostrando mensajes de error genéricos.

## Impacto Potencial

| Área | Impacto | Severidad |
|---|---|---|
| Gestión de usuarios | Usuarios no pueden ser creados/actualizados | **Alta** |
| Autenticación | Login puede fallar si Role Service no responde | **Alta** |
| Auditoría | Eventos no registrados, pérdida de trazabilidad | **Media** |
| IA/RAG | Consultas lentas o no disponibles | **Media-Alta** |
| Frontend | UX degradada, mensajes de error | **Media** |

Riesgos adicionales:
- Inconsistencias entre User Service y Auth Service si la compensación no funciona correctamente.
- Pérdida temporal de observabilidad si Audit Service no consume eventos de RabbitMQ.

---

## Hipótesis de Causa Raíz

### H1: PostgreSQL no disponible o saturado
- User, Role y Auth dependen de PostgreSQL.
- Si PostgreSQL no responde, las operaciones de escritura fallan con 500.
- Migraciones no ejecutadas podrían causar errores en tablas inexistentes.

### H2: Fallos en comunicación inter-servicio
- User Service → Auth Service: si Auth no responde en 5s, la creación de usuario falla (503 + compensación).
- Auth Service → Role Service: si Role Service no responde, login falla (503).
- Role Service → User Service: si User Service no responde, asignación de rol falla (503).

### H3: RabbitMQ no disponible o routing incompatible
- Si RabbitMQ está caído, los eventos de auditoría no se publican (warning pero no error 500).
- Si los bindings no coinciden con las routing keys, Audit Service no consume mensajes.

### H4: Variables de entorno incorrectas
- URLs de servicio usando `localhost` en vez de nombres de servicio Docker.
- Credenciales de base de datos incorrectas.
- JWT_SECRET diferente entre servicios.

### H5: OpenAI con rate limit o alta latencia
- Error 429 del proveedor → AI Service retorna 429 al frontend.
- Latencia elevada del LLM → timeouts percibidos.
- API key inválida o expirada → 503.

### H6: Qdrant no disponible
- Colección inexistente → retrieval retorna contexto vacío.
- Servicio caído → consultas IA degradadas.

### H7: Redis caído
- Operaciones principales continúan (degradación graceful).
- Pero puede causar lentitud por consultas directas a DB.

### H8: Docker networking
- Contenedores reiniciados con IPs nuevas sin resolver DNS correctamente.
- Servicios usando localhost en vez del nombre de servicio Docker.

---

## Plan de Diagnóstico Paso a Paso

### Paso 1: Verificar estado de contenedores
```bash
docker-compose ps
```
Confirmar que todos los contenedores están `Up` y `healthy`.

### Paso 2: Verificar healthchecks de cada servicio
```bash
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # User
curl http://localhost:3003/health  # Role
curl http://localhost:3004/health  # Audit
curl http://localhost:3005/health  # AI
```
Cada respuesta indica: status (ok/degraded), database, redis, jwt_configured.

### Paso 3: Reproducir el error desde el frontend
- Intentar crear un usuario.
- Capturar el `X-Correlation-ID` de la respuesta HTTP.
- Anotar el código de error y mensaje.

### Paso 4: Buscar en logs por correlation_id
```bash
docker-compose logs -f user-service | grep "CORRELATION_ID"
docker-compose logs -f auth-service | grep "CORRELATION_ID"
```

### Paso 5: Revisar logs de error
```bash
docker-compose logs -f user-service 2>&1 | grep '"level":"error"'
docker-compose logs -f auth-service 2>&1 | grep '"level":"error"'
```

### Paso 6: Verificar PostgreSQL
```bash
docker-compose exec postgres pg_isready -U admin
docker-compose exec postgres psql -U admin -d user_management -c "\dt auth.*"
docker-compose exec postgres psql -U admin -d user_management -c "\dt users.*"
docker-compose exec postgres psql -U admin -d user_management -c "\dt roles.*"
```

### Paso 7: Verificar Redis
```bash
docker-compose exec redis redis-cli ping
```

### Paso 8: Verificar RabbitMQ
Acceder a http://localhost:15672 (guest/guest).
- Verificar que exchange `audit.events` existe.
- Verificar colas declaradas y mensajes acumulados.
- Si hay mensajes sin consumir → Audit Service no está procesando.

### Paso 9: Verificar MongoDB
```bash
docker-compose exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin audit --eval "db.audit_events.countDocuments()"
```

### Paso 10: Verificar AI Service y Qdrant
```bash
curl http://localhost:6333/collections
docker-compose logs -f ai-service 2>&1 | grep "latency_ms"
```

### Paso 11: Revisar variables de entorno
```bash
docker-compose exec auth-service env | grep -E "(POSTGRES|JWT|ROLE_SERVICE)"
docker-compose exec user-service env | grep -E "(POSTGRES|AUTH_SERVICE|REDIS)"
```

---

## Uso de Logs Estructurados JSON

Cada microservicio emite logs JSON con la estructura:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "error",
  "service": "user-service",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Failed to create credentials in Auth Service",
  "context": {
    "method": "POST",
    "path": "/users",
    "status_code": 503,
    "duration_ms": 5002,
    "userId": "new-user-uuid"
  }
}
```

Campos clave para diagnóstico:
- `correlation_id`: traza la operación completa entre servicios.
- `level`: filtrar por `error` para encontrar fallos.
- `service`: identificar cuál servicio reporta el problema.
- `duration_ms`: detectar timeouts (>5000ms indica timeout en llamada inter-servicio).
- `status_code`: confirmar tipo de error retornado.

## Uso de Correlation IDs

El flujo de correlation para una operación de creación de usuario:

1. Frontend genera/recibe `X-Correlation-ID` en la respuesta.
2. User Service lo registra en logs al recibir el request.
3. User Service lo incluye en eventos publicados a RabbitMQ.
4. Auth Service lo recibe si se propaga en headers internos.
5. Audit Service lo persiste en MongoDB como campo `correlation_id`.

**Limitación conocida:** La propagación de `X-Correlation-ID` en llamadas REST outbound entre servicios puede no estar completa en todos los clientes internos. Los eventos RabbitMQ sí incluyen el correlation_id.

## Estrategia de Logs Centralizados

**Estado actual:** Cada contenedor emite JSON a stdout. Se consulta con `docker-compose logs`.

**Propuesta para producción:**
1. Recolectar logs con Docker logging driver (json-file o fluentd).
2. Enviar a Loki, ELK (Elasticsearch + Logstash + Kibana) u OpenSearch.
3. Indexar por: `service`, `level`, `correlation_id`, `status_code`, `timestamp`.
4. Configurar alertas por:
   - Errores 500 > umbral en ventana de 5 min.
   - Latencia promedio IA > 10s.
   - Colas RabbitMQ con mensajes acumulados > 100.
   - Healthchecks fallidos.

> Nota: La observabilidad centralizada con herramientas externas no está implementada actualmente. Es una mejora futura recomendada.

---

## Análisis de Comunicación REST entre Servicios

| Ruta | Timeout | Error esperado si falla | Diagnóstico |
|---|---|---|---|
| User → Auth (`POST /auth/internal/credentials`) | 5s | 503 + compensación (elimina usuario) | Revisar logs user-service por "Auth Service" |
| Auth → Role (`GET /roles/user/:id`) | 5s | 503 en login | Revisar logs auth-service por "Role Service" |
| Role → User (`GET /users/:id`) | 5s | 503 en asignación | Revisar logs role-service por "User Service" |
| AI → User (`GET /users/context`) | 5s | 503 en indexación | Revisar logs ai-service |
| AI → Role (`GET /roles`) | 5s | 503 en indexación | Revisar logs ai-service |

Si los servicios usan `localhost` en vez de nombres Docker (`auth-service`, `user-service`, etc.), las llamadas fallarán dentro de contenedores.

## Análisis de Mensajería RabbitMQ

**Exchange:** `audit.events` (topic, durable)

**Routing keys publicadas:**
- `audit.auth.login`
- `audit.user.created`, `audit.user.updated`, `audit.user.deleted`
- `audit.role.created`, `audit.role.deleted`, `audit.role.assigned`, `audit.role.unassigned`
- `audit.ai.query`, `audit.ai.indexed`

**Colas y bindings:**
- `audit.auth.queue` ← `audit.auth.*`
- `audit.user.queue` ← `audit.user.*`
- `audit.role.queue` ← `audit.role.*`
- `audit.ai.queue` ← `audit.ai.*`

**Diagnóstico:**
- Si hay mensajes acumulados en colas → Audit Service no está consumiendo (verificar logs y conexión MongoDB).
- Si las colas no existen → Audit Service no se conectó a RabbitMQ al arrancar.
- Si los eventos no llegan → verificar que los publishers se conectaron correctamente.

## Análisis de Persistencia y Caché

| Componente | Servicio | Diagnóstico |
|---|---|---|
| PostgreSQL | Auth, User, Role | `pg_isready`, verificar schemas y tablas |
| MongoDB | Audit | Verificar conexión y documentos |
| Redis | User, Role | `redis-cli ping`, servicios continúan sin Redis (graceful) |

**Inconsistencias posibles:**
- Usuario creado en User Service pero credencial no creada en Auth Service → compensación debería haber eliminado el usuario.
- Si la compensación falló → inconsistencia: usuario existe sin credencial.

## Análisis de Latencia de IA

El pipeline RAG tiene múltiples etapas:

| Etapa | Latencia típica | Riesgo |
|---|---|---|
| Generación de embedding (query) | 200-500ms | OpenAI API |
| Búsqueda Qdrant (top-5) | 10-50ms | Qdrant local |
| Construcción de prompt | <1ms | Local |
| Respuesta LLM | 1-10s | OpenAI API (variable) |

**Métricas registradas en logs:**
- `latency_ms`: tiempo total del pipeline
- `tokens_in`, `tokens_out`: consumo de tokens
- `cost_estimate`: costo aproximado
- `model`: modelo usado

**Causas de alta latencia:**
1. OpenAI con carga elevada → latencia del LLM > 10s.
2. Contexto demasiado grande → más tokens de entrada → más tiempo.
3. Qdrant lento → verificar healthcheck y colección.
4. Red Docker con problemas → latencia en llamadas externas.

## Análisis de Costos de Tokens

El sistema registra:
- `tokens_in`: tokens de entrada al LLM (system prompt + contexto + query)
- `tokens_out`: tokens de salida (respuesta generada)
- `cost_estimate`: cálculo aproximado basado en pricing público

**Estrategias para reducir costo:**
- Reducir `top-K` (actualmente 5 documentos)
- Prompts más compactos
- Limitar `AI_MAX_TOKENS` (actualmente 1024)
- Cachear respuestas frecuentes (no implementado actualmente)

> Nota: El costo es estimado, no refleja facturación exacta de OpenAI.

## Análisis de Rate Limiting del Proveedor LLM

**Detección:** Error HTTP 429 del proveedor → AI Service retorna 429 al cliente.

**Comportamiento actual:**
- El sistema detecta 429 y retorna mensaje controlado al usuario.
- No implementa retry automático ni backoff (mejora futura).

**Diagnóstico:**
- Revisar logs ai-service por `status_code: 429`.
- Verificar plan de API key de OpenAI.
- Si hay rate limit persistente → reducir frecuencia de consultas o usar API key con mayor cuota.

---

## Plan de Contención

1. **Identificar servicio fallando** via healthchecks y logs.
2. **Reiniciar servicio afectado** si el healthcheck reporta degraded.
3. **Validar variables de entorno** de los servicios con errores.
4. **Si PostgreSQL está caído** → reiniciar contenedor, verificar volumen.
5. **Si RabbitMQ está caído** → reiniciar, los servicios continúan operando (eventos no se publican pero no causan 500).
6. **Comunicar impacto** al equipo y stakeholders.
7. **Priorizar** la recuperación de escritura de usuarios (core transaccional).

## Plan de Resolución

1. Corregir configuración de conexión o variables de entorno.
2. Ejecutar migraciones faltantes si tablas no existen.
3. Corregir routing keys o bindings si eventos no llegan a Audit.
4. Ajustar timeouts si 5s no son suficientes para el entorno.
5. Revisar credenciales y secretos (JWT_SECRET consistente entre servicios).
6. Reindexar IA (`POST /ai/index`) si Qdrant estaba vacío o inconsistente.
7. Validar seed (`npm run seed`) si no existe el usuario admin.

## Validaciones Posteriores

1. Crear usuario → confirmar 201.
2. Verificar credencial creada en Auth Service.
3. Asignar rol al usuario → confirmar 200.
4. Login del usuario → JWT con roles.
5. Acceder a recurso protegido → 200.
6. Verificar evento visible en `GET /audit/events`.
7. Ejecutar consulta IA → respuesta exitosa con metadata.
8. Revisar logs por correlation_id → traza completa.
9. Ejecutar `npm run test:all` → todos los tests pasan.

---

## Comunicación con Stakeholders

### Mensaje Inicial
> "Hemos detectado un incidente que afecta la capacidad de guardar registros en el sistema. Estamos investigando activamente. Los usuarios pueden experimentar errores al crear o actualizar información. Actualizaremos en 30 minutos."

### Actualizaciones Periódicas
- Cada 30 minutos o cuando haya progreso significativo.
- Incluir: servicios afectados, workaround si existe, ETA si es posible.

### Cierre del Incidente
- Causa raíz confirmada.
- Acciones correctivas realizadas.
- Acciones preventivas propuestas.
- Impacto real medido.

### Tono de Comunicación
- Claro y conciso para áreas no técnicas.
- Sin jerga excesiva.
- Enfocado en impacto al usuario y tiempo de resolución.

---

## Matriz de Severidad

| Síntoma | Severidad | Prioridad |
|---|---|---|
| No se pueden crear/actualizar usuarios | **Alta** | P1 - Resolver inmediatamente |
| Login falla por roles no resueltos | **Alta** | P1 |
| Auditoría retrasada | **Media** | P2 - Resolver tras P1 |
| IA con alta latencia pero funcional | **Media** | P2 |
| IA no disponible completamente | **Media-Alta** | P2 |
| Redis caído (solo caché) | **Baja** | P3 - Monitorear |

---

## Comandos Útiles de Diagnóstico

```bash
# Estado de contenedores
docker-compose ps

# Logs por servicio
docker-compose logs -f auth-service
docker-compose logs -f user-service
docker-compose logs -f role-service
docker-compose logs -f audit-service
docker-compose logs -f ai-service
docker-compose logs -f rabbitmq
docker-compose logs -f postgres

# Healthchecks
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health

# PostgreSQL
docker-compose exec postgres pg_isready -U admin
docker-compose exec postgres psql -U admin -d user_management -c "SELECT 1"

# Redis
docker-compose exec redis redis-cli ping

# MongoDB
docker-compose exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin audit --eval "db.audit_events.countDocuments()"

# RabbitMQ Management
# Abrir http://localhost:15672 (guest/guest)

# Qdrant
curl http://localhost:6333/collections

# Buscar errores en logs
docker-compose logs --tail=100 user-service 2>&1 | grep '"level":"error"'

# Login de prueba
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail": "admin", "password": "admin123"}'
```

---

## Conclusión

Este escenario de fallo requiere un enfoque sistemático que siga el flujo de datos entre microservicios, utilizando logs estructurados JSON y correlation IDs como herramienta principal de trazabilidad. La arquitectura del sistema permite aislar el problema por dominio (auth, users, roles, audit, AI) y por tipo de comunicación (REST síncrono vs RabbitMQ asíncrono).

La prioridad siempre es restaurar la funcionalidad core transaccional (escritura de usuarios), seguida de la trazabilidad (auditoría) y finalmente las funcionalidades complementarias (IA/RAG).

**Mejoras futuras recomendadas:**
- Observabilidad centralizada (Loki/Grafana o ELK)
- Tracing distribuido (OpenTelemetry)
- Circuit breaker para llamadas inter-servicio
- Dead Letter Queue para mensajes fallidos
- Retry con backoff exponencial
- Alertas automáticas por healthchecks fallidos
