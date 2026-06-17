# ADR 0004: Usar Redis como Caché

## Contexto
Se necesita reducir carga en PostgreSQL para consultas frecuentes de usuarios y roles.

## Decisión
Usar **Redis** como caché con TTL de 5 minutos y degradación graceful.

## Consecuencias
- Mejora tiempos de respuesta para consultas repetidas
- Si Redis cae, los servicios siguen operando (consultan DB directamente)
- Invalidación explícita en escrituras
- Bajo footprint, soporte nativo en NestJS

## Alternativas Consideradas
- Cache in-memory: No sobrevive reinicios, no compartible entre instancias
- Memcached: Redis ofrece más estructura de datos y persistencia opcional
