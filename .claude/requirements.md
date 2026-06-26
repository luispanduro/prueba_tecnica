# Requirements — Sistema de Gestión de Usuarios con Microservicios e IA

## Contexto del proyecto

Sistema de gestión de usuarios basado en microservicios con autenticación, autorización, auditoría de accesos y gestión de roles. El sistema se complementa con una interfaz web, integración de un agente de IA con RAG y capacidad de diagnóstico operacional. Debe ser completamente ejecutable en local mediante Docker Compose.

Fuente: *Prueba Técnica – Senior Full-Stack Engineer (IA) — Toka, 2025-11-11*

---

## Requerimientos Funcionales

### RF-01 — Autenticación (Auth Service)

- **RF-01.1**: El sistema debe permitir el registro e inicio de sesión de usuarios.
- **RF-01.2**: La autenticación debe implementarse con OAuth2/OIDC. Se permite JWT con validación distribuida entre microservicios como alternativa.
- **RF-01.3**: El Auth Service debe emitir, validar y revocar tokens de acceso.
- **RF-01.4**: La validación de tokens debe realizarse en cada microservicio de forma independiente, sin llamada centralizada en cada request.
- **RF-01.5**: El acceso a recursos debe estar protegido por roles y permisos definidos en el Role Service.

### RF-02 — Gestión de Usuarios (User Service)

- **RF-02.1**: El sistema debe permitir crear, leer, actualizar y eliminar usuarios (CRUD completo).
- **RF-02.2**: Cada usuario debe tener como mínimo: nombre, email y estado (activo/inactivo).
- **RF-02.3**: Los usuarios deben poder ser asignados a uno o más roles.
- **RF-02.4**: El User Service debe consumir al Role Service vía REST para validar roles asignables.

### RF-03 — Gestión de Roles (Role Service)

- **RF-03.1**: El sistema debe permitir crear, leer, actualizar y eliminar roles (CRUD completo).
- **RF-03.2**: Los roles deben asociarse a permisos específicos sobre recursos del sistema.
- **RF-03.3**: El Role Service debe exponer una API REST consultable por Auth Service y User Service.

### RF-04 — Auditoría de Accesos (Audit Service)

- **RF-04.1**: El sistema debe registrar automáticamente eventos de autenticación: login exitoso, logout y fallos de autenticación.
- **RF-04.2**: El sistema debe registrar operaciones sensibles sobre usuarios y roles: creación, modificación y eliminación.
- **RF-04.3**: Los registros de auditoría deben persistirse en MongoDB.
- **RF-04.4**: El Audit Service debe recibir eventos de forma **asíncrona** desde los demás microservicios mediante RabbitMQ o Kafka. No debe recibir llamadas REST directas para escritura de auditoría.

### RF-05 — Comunicación entre Microservicios

- **RF-05.1**: Los microservicios deben comunicarse de forma **síncrona mediante REST** para operaciones que requieran respuesta inmediata (consultas, validaciones).
- **RF-05.2**: Los microservicios deben publicar y consumir **eventos asíncronos** mediante RabbitMQ o Kafka para operaciones no bloqueantes (auditoría, notificaciones internas).
- **RF-05.3**: Debe existir al menos un flujo completo y demostrable de evento asíncrono: productor → broker → consumidor (ej: Auth Service publica evento de login → Audit Service lo consume).

### RF-06 — Interfaz de Usuario (Frontend)

- **RF-06.1**: La UI debe implementarse en React o Angular, ambos con TypeScript.
- **RF-06.2**: La UI debe consumir los microservicios del backend. Se permite un BFF (Backend For Frontend) o capa de agregación básica si es necesario para simplificar la integración.
- **RF-06.3**: La UI debe incluir las siguientes funcionalidades mínimas:
  - Inicio de sesión y cierre de sesión.
  - Listado, creación, edición y eliminación de usuarios.
  - Listado, creación, edición y eliminación de roles.
  - Asignación de roles a usuarios.
  - Visualización de registros de auditoría.
- **RF-06.4**: La UI debe manejar y mostrar **estados de carga** (loading states) de forma explícita en cada operación asíncrona.
- **RF-06.5**: La UI debe manejar y mostrar **errores** al usuario con mensajes descriptivos (error states).
- **RF-06.6**: Los formularios deben incluir **validación en cliente** antes de enviarse al backend (campos requeridos, formatos, etc.).
- **RF-06.7**: La UI debe proporcionar **feedback visual** al usuario tras cada operación (éxito, error, en proceso).

### RF-07 — Integración de Agente de IA (AI Service)

- **RF-07.1**: El sistema debe integrar un agente de IA, implementado como microservicio adicional o como módulo dentro de un microservicio existente.
- **RF-07.2**: El agente debe integrarse con al menos uno de los microservicios del sistema (ej: responder consultas sobre usuarios, generar reportes, resumir auditorías).
- **RF-07.3**: El agente debe implementar **RAG (Retrieval-Augmented Generation)**:
  - Pipeline de generación de embeddings para documentos y contexto del sistema.
  - Almacenamiento de embeddings en una base de datos vectorial.
  - Recuperación de contexto relevante desde el vector DB antes de generar cada respuesta.
- **RF-07.4**: El agente debe contar con una **estrategia de prompt engineering documentada**, que incluya obligatoriamente system prompts y opcionalmente few-shot examples y chain-of-thought.
- **RF-07.5**: El sistema debe registrar y exponer **métricas de evaluación** de las respuestas del agente:
  - Latencia (tiempo de respuesta por consulta, en ms).
  - Coste de tokens (tokens de entrada y de salida por consulta).
  - Validación básica de calidad de la respuesta (no respuestas vacías, coherencia mínima verificable).
- **RF-07.6**: El agente debe manejar errores de la API de IA (rate limiting, timeouts, respuestas inválidas) sin propagar el fallo al resto del sistema. El microservicio debe responder con error controlado.
- **RF-07.7**: Debe existir un ejemplo de uso concreto y ejecutable del agente integrado con al menos uno de los microservicios.

### RF-08 — Diagnóstico Operacional bajo Presión (Ejercicio 4)

Escenario base: *"Los usuarios no pueden guardar registros, algunos microservicios responden con errores 500, y hay reportes de alta latencia en las respuestas de agentes de IA."*

- **RF-08.1**: El sistema — y su documentación — debe permitir **formular y priorizar hipótesis** sobre causas de falla: base de datos, comunicación entre servicios, problemas de red y agentes de IA.
- **RF-08.2**: La arquitectura de logging debe soportar un **plan de diagnóstico sistemático**: los logs deben ser suficientemente ricos para identificar el origen del fallo sin acceso directo al proceso.
- **RF-08.3**: Los logs deben permitir identificar problemas en: base de datos, comunicación entre microservicios, red y agente de IA.
- **RF-08.4**: La solución debe considerar y documentar el diagnóstico específico de **problemas de agentes IA**: alta latencia de respuesta, costos elevados de tokens y rate limiting de la API.
- **RF-08.5**: La propuesta de diagnóstico debe incluir cómo se **priorizan las acciones**: qué se verifica primero y por qué.
- **RF-08.6**: La propuesta debe incluir cómo se **comunicaría el avance a stakeholders**: qué información comunicar, en qué momento y con qué nivel de detalle según el interlocutor (técnico vs. negocio).

---

## Requerimientos No Funcionales

### RNF-01 — Arquitectura y Patrones de Diseño

- **RNF-01.1**: El sistema debe estructurarse en **al menos 3-4 microservicios independientes**: Auth Service, User Service, Audit Service y Role Service. El AI Service puede ser un quinto microservicio o módulo integrado.
- **RNF-01.2**: Cada microservicio debe ser **autónomo**: base de datos propia, despliegue independiente y sin acoplamiento de código directo con otros servicios.
- **RNF-01.3**: Cada microservicio debe aplicar principios de **Domain-Driven Design (DDD)**: separación en capas (domain, application, infrastructure), uso de entidades, value objects, repositorios y servicios de dominio.
- **RNF-01.4**: Cada microservicio debe aplicar principios de **Clean Architecture**: las capas internas no deben depender de las externas; las dependencias apuntan hacia el dominio.
- **RNF-01.5**: Se debe aplicar el patrón **CQRS** donde resulte apropiado (separación de comandos y consultas).
- **RNF-01.6**: La arquitectura debe contemplar **resiliencia ante fallos**: circuit breaker, reintentos con backoff y manejo de fallos en cascada entre servicios.
- **RNF-01.7**: La arquitectura debe ser **escalable horizontalmente**: cada microservicio debe poder tener múltiples instancias sin modificar los demás.
- **RNF-01.8**: La arquitectura debe permitir **agregar nuevos microservicios** sin modificar los existentes (bajo acoplamiento, contratos bien definidos).

### RNF-02 — Persistencia y Estrategia Multi-DB

- **RNF-02.1**: Los datos transaccionales (usuarios, roles, permisos, tokens) deben almacenarse en una base de datos **relacional**: SQL Server, MySQL o PostgreSQL, según elección justificada.
- **RNF-02.2**: Los registros de auditoría deben almacenarse en **MongoDB** (esquema flexible, alto volumen de escritura por eventos).
- **RNF-02.3**: El **caching** de datos frecuentes (sesiones, tokens validados, permisos resueltos) debe gestionarse con **Redis**.
- **RNF-02.4**: Cada base de datos debe ejecutarse en un **contenedor Docker independiente**.
- **RNF-02.5**: La elección de cada tecnología de base de datos debe estar **justificada** en la documentación arquitectónica.

### RNF-03 — Seguridad

- **RNF-03.1**: Todos los endpoints deben **validar y sanitizar los inputs** recibidos. Se deben prevenir al menos las vulnerabilidades del OWASP Top 10: SQLi, XSS, inyección de comandos, entre otros.
- **RNF-03.2**: Las **credenciales, API keys y secretos** no deben estar hardcodeados en el código. Deben gestionarse mediante variables de entorno o secretos de Docker Compose.
- **RNF-03.3**: La **comunicación entre microservicios** debe estar autenticada; los endpoints internos no deben ser accesibles sin validación de token.
- **RNF-03.4**: Los tokens de acceso deben tener **tiempo de expiración** definido y el sistema debe manejar la renovación o rechazo de tokens expirados.

### RNF-04 — Calidad de Código y Testing

- **RNF-04.1**: El código debe seguir principios **SOLID** en todos los microservicios.
- **RNF-04.2**: El código debe ser **limpio y legible**: nombrado descriptivo, sin duplicación innecesaria, responsabilidades bien delimitadas.
- **RNF-04.3**: Los **tests unitarios** de cada microservicio deben alcanzar un **coverage mínimo del 70%**, medido y reportado con herramienta de coverage del stack elegido.
- **RNF-04.4**: Los **tests del frontend** deben cubrir: componentes principales, flujos de interacción críticos y lógica de state management.
- **RNF-04.5**: El **lenguaje backend** puede ser: C# (.NET 8+), Python (FastAPI) o Node.js (Express/NestJS). La elección debe ser consistente entre microservicios o justificada si se mezcla.
- **RNF-04.6**: El **ORM** debe ser coherente con el stack elegido: Entity Framework Core (.NET), SQLAlchemy (Python) o equivalente (Node.js).

### RNF-05 — Observabilidad y Logging

- **RNF-05.1**: Todos los microservicios deben implementar **logging estructurado en formato JSON**.
- **RNF-05.2**: Cada entrada de log debe incluir: timestamp, nivel de severidad, nombre del servicio de origen, correlation ID de la request y payload relevante sin datos sensibles.
- **RNF-05.3**: Los logs deben ser **centralizables**: compatibles con herramientas como ELK Stack, Grafana Loki o similar, aunque no se requiere implementar el stack completo de centralización.
- **RNF-05.4**: Los logs deben tener **granularidad suficiente** para permitir diagnóstico sin acceso directo al proceso (distinguir: fallo de DB, fallo de conexión entre servicios, error de API de IA, etc.).

### RNF-06 — Contenedorización y Despliegue Local

- **RNF-06.1**: Cada microservicio debe contar con su propio **Dockerfile** optimizado (multi-stage build recomendado).
- **RNF-06.2**: Un único **`docker-compose.yml`** debe orquestar todos los servicios: microservicios backend, frontend, bases de datos, Redis, broker de mensajería y vector DB del AI Service.
- **RNF-06.3**: El sistema completo debe poder levantarse con **un solo comando** (`docker compose up`) sin pasos manuales adicionales ni configuración previa más allá de las variables de entorno documentadas.
- **RNF-06.4**: El **frontend debe estar incluido** en el `docker-compose.yml` y ser accesible desde el navegador en local (puerto documentado).
- **RNF-06.5**: Todos los servicios de infraestructura (DBs, broker, vector DB) deben usar **imágenes oficiales** y tener **healthchecks** definidos en el `docker-compose.yml`.

### RNF-07 — Mensajería Asíncrona

- **RNF-07.1**: El broker de mensajería (**RabbitMQ o Kafka**) debe ejecutarse como contenedor dentro del `docker-compose.yml`.
- **RNF-07.2**: Debe existir al menos un flujo completo de evento asíncrono funcional y documentado: productor → broker → consumidor.
- **RNF-07.3**: El manejo de mensajes debe contemplar errores: reintentos y dead-letter queue (o equivalente) cuando aplique.

### RNF-08 — State Management del Frontend

- **RNF-08.1**: La aplicación frontend debe implementar **state management centralizado**: Redux Toolkit o Zustand (React) / NGRX (Angular).
- **RNF-08.2**: El estado global debe gestionar de forma explícita: sesión de usuario autenticado, datos cargados de cada entidad, estados de carga por operación y errores por operación.
- **RNF-08.3**: El **estado de sesión** debe persistir adecuadamente entre recargas de página (localStorage o equivalente) y limpiarse al cerrar sesión.

### RNF-09 — Infraestructura de IA y Vector DB

- **RNF-09.1**: La **base de datos vectorial** debe ejecutarse preferentemente como contenedor local (Qdrant o Chroma), o usar un servicio gestionado (Pinecone, Weaviate, Azure Cognitive Search) con acceso documentado.
- **RNF-09.2**: Los **embeddings** deben generarse con OpenAI Embeddings, Azure OpenAI Embeddings o modelos locales equivalentes. La elección debe justificarse.
- **RNF-09.3**: El AI Service debe implementarse con **LangChain, Semantic Kernel o llamadas directas** a la API del proveedor de IA. La elección debe justificarse.
- **RNF-09.4**: El agente debe **controlar el coste de tokens** por consulta: establecer límites de tokens de salida y registrar el coste real de cada interacción.
- **RNF-09.5**: El **rate limiting** de las APIs de IA debe manejarse con reintentos con backoff exponencial y respuesta de error controlada al cliente.
- **RNF-09.6**: La **calidad de las respuestas** del agente debe validarse mínimamente: detectar respuestas vacías, fuera de contexto o truncadas, y registrarlas.

### RNF-10 — Documentación

- **RNF-10.1**: Debe entregarse un **diagrama de arquitectura** en formato visual o Mermaid que muestre todos los microservicios, sus interacciones, tecnologías de datos y flujos de comunicación síncrona/asíncrona.
- **RNF-10.2**: Debe entregarse una **justificación de decisiones técnicas**: por qué se eligió cada tecnología y patrón arquitectónico.
- **RNF-10.3**: Debe entregarse una **explicación del flujo de datos** entre microservicios: qué datos viajan, por qué canal (REST vs. evento) y en qué dirección.
- **RNF-10.4**: Debe entregarse una **explicación de aplicación de DDD y Clean Architecture** en cada microservicio: cómo se organizan las capas y dónde viven las entidades, repositorios y servicios de dominio.
- **RNF-10.5**: Debe entregarse **documentación de ejecución del sistema completo**: pasos para levantar el entorno desde cero, variables de entorno requeridas y puertos expuestos.
- **RNF-10.6**: Debe entregarse una **documentación de ejecución del frontend**: cómo levantarlo de forma aislada (modo desarrollo) además de vía Docker Compose.
- **RNF-10.7**: Debe entregarse la **documentación de la estrategia de prompt engineering** del agente IA: system prompts utilizados, estructura de los prompts, ejemplos few-shot si aplica y justificación de las decisiones.
- **RNF-10.8**: Debe entregarse una **explicación de cómo el AI Service se integra** con el sistema existente: qué microservicios consume, qué datos recupera y cómo enriquece las respuestas con RAG.

---

## Entregables Esperados

### Arquitectura (Ejercicio 1)

- [ ] Diagrama de arquitectura (formato visual o Mermaid) con todos los microservicios, interacciones, tecnologías y flujos.
- [ ] Justificación de decisiones técnicas (tecnología y patrón por servicio).
- [ ] Explicación del flujo de datos entre microservicios.
- [ ] Diseño base del `docker-compose.yml` (estructura, servicios, dependencias).
- [ ] Explicación de la aplicación de DDD y Clean Architecture.

### Microservicios (Ejercicio 2)

- [ ] Código fuente de todos los microservicios implementados.
- [ ] `Dockerfile` por cada microservicio.
- [ ] `docker-compose.yml` funcional y completo que orqueste todos los servicios.
- [ ] Tests unitarios con **coverage report** generado (≥ 70% por servicio).
- [ ] Documentación de cómo ejecutar el sistema completo.
- [ ] Explicación de cómo se aplicaron DDD y Clean Architecture en la implementación.

### Frontend (Ejercicio 3)

- [ ] Código fuente de la aplicación frontend.
- [ ] Configuración del state management.
- [ ] Tests básicos de componentes y lógica.
- [ ] Integración funcional con los microservicios del Ejercicio 2.
- [ ] Documentación de cómo ejecutar el frontend en modo desarrollo.
- [ ] `docker-compose.yml` actualizado para incluir el frontend.

### Diagnóstico bajo presión (Ejercicio 4)

- [ ] Documento de respuesta con: hipótesis priorizadas, plan de diagnóstico, uso de logs centralizados, consideraciones de agentes IA y plan de comunicación a stakeholders.

### IA y Agentes (Ejercicio 5)

- [ ] Código del microservicio o módulo de IA implementado.
- [ ] Pipeline de embeddings implementado y ejecutable.
- [ ] Documentación de la estrategia de prompt engineering.
- [ ] Código de evaluación de respuestas (latencia y coste de tokens).
- [ ] Ejemplo concreto y ejecutable del agente integrado con al menos un microservicio.
- [ ] Explicación de cómo el AI Service se integra con el sistema existente.

---

## Stack Tecnológico Definido

| Capa | Tecnología permitida |
|---|---|
| Backend | C# (.NET 8+), Python (FastAPI) o Node.js (Express/NestJS) |
| ORM | Entity Framework Core, SQLAlchemy o equivalente según stack |
| BD Relacional | SQL Server, MySQL o PostgreSQL (contenedor) |
| BD Documental | MongoDB (contenedor) |
| Caché | Redis (contenedor) |
| Mensajería | RabbitMQ o Kafka (contenedor) |
| Frontend | React con TypeScript o Angular con TypeScript |
| State Management | Redux Toolkit / Zustand (React) o NGRX (Angular) |
| HTTP Client | Axios, Fetch API o Angular HttpClient |
| Build Frontend | Vite, Create React App o Angular CLI |
| Testing Backend | xUnit / pytest / Jest según stack |
| Testing Frontend | Jest + React Testing Library o Jest + Angular Testing |
| Contenedores | Docker + Docker Compose |
| IA — API | OpenAI, Azure OpenAI, Anthropic o Gemini |
| IA — Framework | LangChain, Semantic Kernel o implementación directa |
| Vector DB | Qdrant o Chroma (contenedor local) · Pinecone, Weaviate o Azure Cognitive Search (gestionado) |
| Embeddings | OpenAI Embeddings, Azure OpenAI Embeddings o modelos locales |

---

## Microservicios y Responsabilidades

| Servicio | Responsabilidad principal | Comunicación recibida | BD |
|---|---|---|---|
| Auth Service | Registro, login, emisión y validación de JWT | REST (clientes y otros servicios) | PostgreSQL + Redis |
| User Service | CRUD de usuarios, asignación de roles | REST | PostgreSQL |
| Role Service | CRUD de roles y permisos | REST | PostgreSQL |
| Audit Service | Registro de eventos de sistema | Asíncrona (RabbitMQ/Kafka) | MongoDB |
| AI Service | Agente RAG, consultas en lenguaje natural, métricas | REST | Vector DB |
| Frontend / BFF | UI web; BFF opcional para agregación | — consume los servicios anteriores | — |
