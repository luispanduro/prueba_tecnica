# ADR 0002: Usar TypeORM con PostgreSQL

## Contexto
Se necesita un ORM compatible con TypeScript y PostgreSQL que soporte migraciones, repository pattern y múltiples schemas.

## Decisión
Usar **TypeORM** con **PostgreSQL** para datos transaccionales. Cada servicio usa su propio schema (auth, users, roles).

## Consecuencias
- Repository pattern alineado con DDD
- Migraciones controladas
- Schemas separados proveen aislamiento lógico sin múltiples instancias
- Prepared statements protegen contra SQL injection

## Alternativas Consideradas
- Prisma: API moderna pero menos flexible para schemas separados
- Sequelize: Menos tipado, más legacy
- SQL Server/MySQL: PostgreSQL elegido por ser open source con mejor ecosistema Docker
