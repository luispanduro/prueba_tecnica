# ADR 0003: Usar MongoDB para Auditoría

## Contexto
Los eventos de auditoría son heterogéneos (diferentes campos según tipo) y se escriben como append-only.

## Decisión
Usar **MongoDB** con Mongoose para el Audit Service.

## Consecuencias
- Schema flexible para eventos con estructura variable
- Optimizado para escrituras append-only de alto volumen
- No requiere migraciones estrictas
- Separación clara de responsabilidades: SQL para transaccional, Mongo para eventos

## Alternativas Consideradas
- PostgreSQL con JSONB: Viable pero mezclaría concern con datos transaccionales
- Elasticsearch: Sobredimensionado para este alcance
