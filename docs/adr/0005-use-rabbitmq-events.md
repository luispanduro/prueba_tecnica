# ADR 0005: Usar RabbitMQ para Eventos Asíncronos

## Contexto
Se necesita comunicación asíncrona para auditoría: los servicios publican eventos sin esperar respuesta del Audit Service.

## Decisión
Usar **RabbitMQ** con exchange topic `audit.events`, colas durables y ack manual.

## Consecuencias
- Desacoplamiento total entre publishers y consumer
- Mensajes persistentes (no se pierden si Audit Service reinicia)
- Topic exchange permite routing flexible por patrones
- Management UI incluida para monitoreo
- Más simple de operar localmente que Kafka para este volumen

## Alternativas Consideradas
- Kafka: Más complejo, mejor para altísimo volumen y replay
- Comunicación REST directa: Acoplaría todos los servicios al Audit Service
