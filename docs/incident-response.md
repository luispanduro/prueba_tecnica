# Plan de Diagnóstico Operacional — Ejercicio 4

## 1. Escenario

> "Los usuarios no pueden guardar registros, algunos microservicios responden con errores 500, y hay reportes de alta latencia en las respuestas de agentes de IA."

---

## 2. Hipótesis priorizadas

Las hipótesis se ordenan del problema más probable y de mayor impacto al más específico, siguiendo el principio de verificar primero la infraestructura base antes de las capas de aplicación.

| Prioridad | Hipótesis | Indicador en logs | Verificación |
|---|---|---|---|
| 1 | **BD caída o saturada** | `"action": "db.query.failed"` con `reason: "connection_refused"` o `"timeout"` | `docker ps` → estado de postgres/mongo. `docker logs postgres` |
| 2 | **Servicio caído** | Ausencia de logs de health o `circuit breaker OPEN` en logs del BFF | `GET /health` en cada microservicio. RabbitMQ UI en :15672 |
| 3 | **RabbitMQ saturado** | Audit Service con backpressure, mensajes en DLQ | RabbitMQ Management UI → Queue depth |
| 4 | **Redis inaccesible** | Auth Service: `"reason": "token_validation_failed"` + `"cache_miss"` repetidos | `docker exec redis redis-cli ping` |
| 5 | **Fallo en cascada** | Circuit breaker OPEN en User Service hacia Role Service | Logs de User Service con `circuit_breaker_open` |
| 6 | **Rate limit de OpenAI** | AI Service: `"reason": "rate_limit_exceeded"`, `retryAfterMs` > 0 | Logs de ai-service con `level: "error"` + `action: "ai.query.failed"` |
| 7 | **Alta latencia de OpenAI** | AI Service: `llmLatencyMs` > 5000 consistentemente | Métricas en `GET /ai/metrics`, logs de AI Service |
| 8 | **Costo de tokens elevado** | `estimatedCostUSD` > threshold por consulta | Métricas de AI Service, dashboard de OpenAI |

**Justificación del orden:**
- Las hipótesis 1–2 cubren fallos de infraestructura base (BD y servicios): son las causas más comunes de errores 500 generalizados y bloquean cualquier operación de escritura.
- La hipótesis 3 (RabbitMQ) afecta la auditoría pero no bloquea las escrituras directamente; sin embargo un backlog extremo puede ejercer presión sobre los servicios que publican.
- La hipótesis 4 (Redis) impacta solo la validación de tokens; los errores 500 serían selectivos (solo usuarios con tokens no cacheados).
- Las hipótesis 5–8 son fallos en cascada o específicos del AI Service, cuyo alcance es más acotado.

---

## 3. Plan de diagnóstico paso a paso

### PASO 1 — Verificar estado de contenedores (30 segundos)

Objetivo: identificar rápidamente si algún contenedor está caído o reiniciándose.

```bash
# Ver estado de todos los contenedores del stack
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Ver consumo de recursos en tiempo real
docker stats --no-stream
```

**Qué buscar:** contenedores en estado `Exit`, `Restarting` o con uso de CPU/memoria al 100%.

---

### PASO 2 — Revisar logs de infraestructura (2 minutos)

Objetivo: descartar fallo en la capa de datos.

```bash
# Revisar últimas 100 líneas de cada servicio de infraestructura
docker logs toka-postgres --tail 100

docker logs toka-rabbitmq --tail 100

docker logs toka-redis --tail 100

docker logs toka-mongodb --tail 100
```

**Qué buscar:** mensajes de `FATAL`, `ERROR`, `out of memory`, `max_connections`, `connection refused`, `disk full`.

---

### PASO 3 — Rastrear una request fallida por correlationId (3 minutos)

Objetivo: identificar en qué servicio se rompe la cadena de una request concreta.

```bash
# 1. Obtener un correlationId de una request fallida desde el BFF
docker logs toka-bff --tail 200 | grep '"level":"error"'

# 2. Extraer el correlationId (ej: "abc-123-def")
# 3. Rastrear ese correlationId en cada microservicio
docker logs toka-auth-service | grep "abc-123-def"
docker logs toka-user-service | grep "abc-123-def"
docker logs toka-role-service | grep "abc-123-def"
docker logs toka-audit-service | grep "abc-123-def"
docker logs toka-ai-service | grep "abc-123-def"
```

**Qué buscar:** el servicio donde el correlationId aparece con `"level":"error"` y sin respuesta downstream. Ese es el punto de fallo.

---

### PASO 4 — Verificar healthchecks de microservicios (1 minuto)

Objetivo: confirmar qué servicios están operativos a nivel de aplicación.

```bash
curl -s http://localhost:3001/health | jq .   # auth-service
curl -s http://localhost:3002/health | jq .   # user-service
curl -s http://localhost:3003/health | jq .   # role-service
curl -s http://localhost:3005/health | jq .   # audit-service
curl -s http://localhost:3004/health | jq .   # ai-service
curl -s http://localhost:3000/health | jq .   # bff
```

**Qué buscar:** respuestas con `"status": "degraded"` o `"down"` y cuáles dependencias (`database`, `redis`, `rabbitmq`) están marcadas como `"down"`.

---

### PASO 5 — Diagnóstico específico del AI Service (2 minutos)

Objetivo: determinar si la alta latencia es por OpenAI, Qdrant o el pipeline RAG.

```bash
# Verificar disponibilidad de Qdrant y conectividad a OpenAI
curl -s http://localhost:3004/health | jq .

# Revisar métricas de las últimas consultas (latencia, costo, tokens)
curl -s http://localhost:3004/ai/metrics | jq '.[0:5]'

# Filtrar errores específicos del AI Service
docker logs toka-ai-service | grep '"level":"error"'

# Ver latencia LLM reciente
docker logs toka-ai-service --tail 50 | grep '"action":"ai.query.completed"'
```

**Qué buscar:**
- `llmLatencyMs` > 5000 → rate limit o latencia de OpenAI
- `"reason":"rate_limit_exceeded"` → se agotó la cuota
- `qdrant` en `"down"` en `/health` → el vector store no está disponible

---

### PASO 6 — Verificar RabbitMQ y colas de auditoría (1 minuto)

Objetivo: confirmar que la mensajería no está saturada y la DLQ no acumula fallos.

```bash
# Abrir la Management UI (credenciales del .env: RABBITMQ_USER / RABBITMQ_PASSWORD)
# http://localhost:15672

# O consultar via API de gestión de RabbitMQ
curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
  http://localhost:15672/api/queues/%2F/audit.events.queue | jq '{messages, consumers, state}'

# Revisar si hay mensajes en la Dead Letter Queue
curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
  http://localhost:15672/api/queues/%2F/audit.dlq | jq '{messages}'
```

**Qué buscar:** `messages` > 1000 en `audit.events.queue` (backlog), cualquier mensaje en `audit.dlq` (indica fallos de procesamiento repetidos).

---

## 4. Acciones correctivas por causa identificada

| Causa identificada | Acción inmediata | Acción preventiva |
|---|---|---|
| PostgreSQL caído | `docker restart toka-postgres` | Aumentar límite de conexiones (`max_connections`), implementar connection pooling (PgBouncer) |
| Servicio de aplicación caído | `docker restart <nombre-servicio>` | Agregar `restart: unless-stopped` en `docker-compose.yml` a todos los microservicios |
| Rate limit de OpenAI | Verificar `retryAfterMs` en logs, esperar el tiempo indicado o rotar temporalmente a una API key de respaldo | Implementar request queuing y límite de `requests/min` en el AI Service; configurar alertas al 80% de cuota |
| Alta latencia del LLM | Reducir `maxTokens` de 800 a 400 en la llamada a GPT-4o-mini, o cambiar temporalmente a `gpt-3.5-turbo` | Implementar cache de respuestas frecuentes en Redis con TTL de 1 hora |
| Redis inaccesible | `docker restart toka-redis` | Habilitar persistencia AOF en Redis (`appendonly yes`); configurar healthcheck más agresivo |
| RabbitMQ saturado o caído | `docker restart toka-rabbitmq`; revisar si el Audit Service procesa mensajes | Aumentar `prefetch` del consumer de Audit Service; escalar con múltiples réplicas del audit-service |
| MongoDB caído | `docker restart toka-mongodb` | Habilitar replica set para MongoDB; monitorear espacio en disco del volumen `mongodb-data` |
| Fallo en cascada (circuit breaker abierto) | Verificar que Role Service esté operativo; esperar `resetTimeout` (30s) para cierre automático del breaker | Revisar umbral `errorThresholdPercentage`; implementar respuestas de fallback más granulares |

---

## 5. Comunicación a stakeholders

### Mensaje inicial — primeros 5 minutos (a todos los stakeholders)

> "Estamos experimentando un problema que afecta la capacidad de guardar registros. El equipo técnico ya está investigando la causa. Próxima actualización en 15 minutos."

---

### Mensaje a los 15 minutos — versión para negocio

> "Identificamos que [causa identificada] está causando el problema. Estimamos resolución en [X] minutos. Los datos NO se han perdido. La funcionalidad de solo lectura sigue disponible."

**Ejemplo concreto (si la causa fue PostgreSQL):**
> "Identificamos que la base de datos principal tuvo un reinicio inesperado, lo que impidió guardar nuevos registros durante aproximadamente 20 minutos. Estimamos restauración completa del servicio en los próximos 5 minutos. Los datos existentes están íntegros y las consultas de información funcionan con normalidad."

---

### Mensaje a los 15 minutos — versión técnica

> "Causa raíz: [causa específica con correlationId y log excerpt]. Plan: [pasos técnicos]. Servicios afectados: [lista]. ETR: [X] minutos."

**Ejemplo concreto:**
> "Causa raíz: PostgreSQL reinició por OOM (Out of Memory) — confirmado en `docker logs toka-postgres` con `FATAL: out of memory` a las 14:32 UTC (correlationId: abc-123-def visible en toka-user-service con `action: db.query.failed`). Plan: reiniciar postgres con `docker restart toka-postgres`, verificar healthcheck, confirmar que user-service y auth-service reconectan automáticamente vía TypeORM. Servicios afectados: user-service (HTTP 500 en escrituras), auth-service (HTTP 500 en register), role-service (HTTP 500 en creación de roles). ETR: 3 minutos."

---

### Mensaje al resolver el incidente (a todos)

> "El servicio fue restaurado a las [hora]. La causa fue [causa] y se resolvió mediante [acción]. Se implementarán [medidas preventivas] para evitar recurrencia."

**Ejemplo concreto:**
> "El servicio fue restaurado a las 14:37 UTC. La causa fue un agotamiento de memoria en el contenedor de PostgreSQL (consumo llegó al 100% del límite configurado de 512MB) que provocó un reinicio automático del proceso. Se resolvió mediante `docker restart toka-postgres` y ajuste del límite de memoria a 1GB en `docker-compose.yml`. Se implementarán monitoreo de métricas de memoria con alertas al 80% y configuración de `restart: unless-stopped` en todos los contenedores de infraestructura para evitar interrupciones futuras."
