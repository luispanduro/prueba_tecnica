# ADR 0001: Usar NestJS para Microservicios Backend

## Contexto
Se necesita un framework backend TypeScript que soporte DDD, Clean Architecture, inyección de dependencias y módulos bien separados para microservicios.

## Decisión
Usar **Node.js + NestJS** (TypeScript) para todos los microservicios.

## Consecuencias
- Ecosistema unificado con el frontend (TypeScript)
- Inyección de dependencias nativa
- Soporte para decoradores, guards, interceptors, pipes
- Módulos NestJS mapean naturalmente a bounded contexts
- Amplia comunidad y ecosistema de paquetes (@nestjs/typeorm, @nestjs/config, @nestjs/throttler)

## Alternativas Consideradas
- C# .NET 8+: Robusto pero ecosistema diferente al frontend
- Python FastAPI: Excelente para APIs pero menos soporte nativo DDD/DI
