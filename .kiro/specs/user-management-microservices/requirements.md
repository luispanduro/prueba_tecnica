# Requirements Document

## Introduction

Este documento establece los requerimientos formales para un sistema de gestión de usuarios basado en microservicios. El sistema constituye una evaluación técnica para el rol de Senior Full-Stack Engineer (AI) y demuestra competencias avanzadas en desarrollo full-stack, arquitectura de microservicios, diseño con DDD y Clean Architecture, comunicación entre servicios, integración de agentes de IA con RAG, dockerización local y testing.

El sistema abarca cinco dominios principales: autenticación, gestión de usuarios, gestión de roles, auditoría e inteligencia artificial con contexto aumentado. Todos los componentes deben ejecutarse localmente mediante Docker Compose.

## Glossary

- **Sistema**: El conjunto completo de microservicios, frontend y componentes de infraestructura que conforman la solución de gestión de usuarios.
- **Auth_Service**: Microservicio responsable de autenticación y autorización de usuarios.
- **User_Service**: Microservicio responsable de las operaciones de gestión de usuarios.
- **Role_Service**: Microservicio responsable de la gestión de roles y su asignación a usuarios.
- **Audit_Service**: Microservicio responsable del registro y consulta de eventos de auditoría.
- **AI_Service**: Microservicio o módulo responsable de la integración con LLM y la implementación de RAG.
- **Frontend**: Aplicación web en React o Angular con TypeScript que consume los microservicios.
- **DDD (Domain-Driven Design)**: Enfoque de diseño de software que centra el desarrollo en el dominio del negocio, separando la lógica en capas con límites bien definidos.
- **Clean_Architecture**: Patrón arquitectónico que organiza el código en capas concéntricas con dependencias apuntando hacia el dominio, separando infraestructura de lógica de negocio.
- **RAG (Retrieval-Augmented Generation)**: Técnica que enriquece las consultas a un LLM con información recuperada de una base de datos vectorial para mejorar la relevancia de las respuestas.
- **Embeddings**: Representaciones vectoriales numéricas de texto que permiten búsqueda semántica en una base de datos vectorial.
- **LLM (Large Language Model)**: Modelo de lenguaje de gran escala utilizado para generar respuestas en lenguaje natural.
- **JWT (JSON Web Token)**: Estándar para transmitir información de identidad y claims de forma segura entre partes mediante un token firmado.
- **OAuth2_OIDC**: Protocolos estándar de autorización y autenticación para emitir y validar tokens de acceso e identidad.
- **SOLID**: Conjunto de cinco principios de diseño orientado a objetos (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion).
- **OWASP**: Organización que define estándares y guías de seguridad para aplicaciones web, incluyendo protección contra inyección, XSS y otras vulnerabilidades.
- **Docker_Compose**: Herramienta para definir y ejecutar aplicaciones multi-contenedor mediante un archivo YAML declarativo.
- **Message_Broker**: Componente de mensajería (RabbitMQ o Kafka) utilizado para comunicación asíncrona basada en eventos entre microservicios.
- **Vector_DB**: Base de datos vectorial (Qdrant, Chroma, Pinecone, Weaviate o Azure Cognitive Search) utilizada para almacenar y buscar embeddings.
- **Redis**: Almacén de datos en memoria utilizado como caché para mejorar rendimiento y reducir carga en bases de datos principales.
- **Administrador**: Usuario con rol de administración que puede gestionar usuarios, roles y consultar auditoría.
- **Usuario_Final**: Persona que se autentica en el sistema y utiliza funcionalidades según el rol asignado.
- **Entregable**: Documento o artefacto escrito que forma parte de la evaluación técnica pero no es una funcionalidad del sistema.

## Requirements

### Requirement 1: Autenticación de Usuarios

**User Story:** Como Usuario_Final, quiero autenticarme en el sistema con mis credenciales, para obtener un token de acceso que me permita utilizar las funcionalidades protegidas.

#### Acceptance Criteria

1. WHEN un Usuario_Final envía credenciales válidas (nombre de usuario y contraseña) al endpoint de login, THE Auth_Service SHALL emitir un token de acceso válido mediante OAuth2_OIDC o JWT distribuido.
2. WHEN un Usuario_Final envía credenciales inválidas al endpoint de login, THE Auth_Service SHALL rechazar la solicitud con un código de error HTTP 401 y un mensaje descriptivo sin revelar cuál credencial es incorrecta.
3. THE Auth_Service SHALL validar el token de acceso en cada solicitud a un endpoint protegido antes de permitir el acceso al recurso.
4. WHEN un token de acceso ha expirado o es inválido, THE Auth_Service SHALL rechazar la solicitud con un código HTTP 401.
5. THE Auth_Service SHALL almacenar las contraseñas utilizando un algoritmo de hashing seguro (bcrypt, Argon2 o equivalente) con salt único por usuario.

### Requirement 2: Autorización Basada en Roles

**User Story:** Como Administrador, quiero que el sistema controle el acceso a funcionalidades según los roles asignados a cada usuario, para garantizar que solo usuarios autorizados ejecuten operaciones sensibles.

#### Acceptance Criteria

1. WHEN un usuario autenticado solicita acceso a un recurso protegido, THE Auth_Service SHALL verificar que el usuario posee un rol con permiso para acceder a dicho recurso.
2. WHEN un usuario autenticado no posee el rol requerido para un recurso, THE Auth_Service SHALL denegar el acceso con un código HTTP 403.
3. THE Auth_Service SHALL incluir los roles del usuario en el token de acceso emitido durante la autenticación.

### Requirement 3: Gestión de Usuarios

**User Story:** Como Administrador, quiero realizar operaciones básicas de gestión de usuarios necesarias para cumplir la prueba técnica, para mantener actualizado el registro de personas con acceso.

#### Acceptance Criteria

1. WHEN el Administrador envía una solicitud de creación con datos válidos, THE User_Service SHALL crear un nuevo usuario y retornar los datos del usuario creado con un código HTTP 201.
2. WHEN el Administrador solicita consultar usuarios registrados, THE User_Service SHALL retornar usuarios registrados de forma consultable para el Frontend.
3. WHEN el Administrador solicita los datos de un usuario existente por su identificador, THE User_Service SHALL retornar la información del usuario solicitado.
4. WHEN el Administrador envía una solicitud de actualización con datos válidos para un usuario existente, THE User_Service SHALL actualizar los datos del usuario y retornar la información actualizada.
5. WHEN el Administrador envía una solicitud de eliminación para un usuario existente, THE User_Service SHALL eliminar o desactivar el usuario del sistema.
6. IF el Administrador envía una solicitud de creación con datos inválidos o incompletos, THEN THE User_Service SHALL rechazar la solicitud con un código HTTP 400 y mensajes de validación descriptivos por cada campo inválido.
7. IF el Administrador solicita un usuario con un identificador inexistente, THEN THE User_Service SHALL retornar un código HTTP 404.

### Requirement 4: Gestión de Roles

**User Story:** Como Administrador, quiero realizar operaciones básicas de gestión de roles y asignación de roles a usuarios, para demostrar control de acceso basado en roles.

#### Acceptance Criteria

1. WHEN el Administrador envía una solicitud de creación de rol con datos válidos, THE Role_Service SHALL crear el rol y retornar los datos del rol creado con un código HTTP 201.
2. WHEN el Administrador solicita la lista de roles, THE Role_Service SHALL retornar todos los roles disponibles en el sistema.
3. WHEN el Administrador solicita la asignación de un rol existente a un usuario existente, THE Role_Service SHALL asociar el rol al usuario y confirmar la operación.
4. WHEN el Administrador solicita la eliminación de un rol asignado a un usuario, THE Role_Service SHALL remover la asociación entre el rol y el usuario.
5. IF el Administrador intenta crear un rol con un nombre que ya existe, THEN THE Role_Service SHALL rechazar la solicitud con un código HTTP 409 indicando conflicto.
6. IF el Administrador intenta asignar un rol o usuario inexistente, THEN THE Role_Service SHALL rechazar la solicitud con un código HTTP 404.

### Requirement 5: Auditoría de Eventos

**User Story:** Como Administrador, quiero que el sistema registre automáticamente las acciones relevantes realizadas, para contar con trazabilidad básica de las acciones relevantes solicitadas por la prueba técnica.

#### Acceptance Criteria

1. WHEN un usuario se autentica exitosamente, THE Audit_Service SHALL registrar un evento de auditoría con la identidad del usuario, la acción realizada, la marca temporal y la dirección IP de origen.
2. WHEN se ejecuta una operación de creación, actualización o eliminación sobre un usuario, THE Audit_Service SHALL registrar un evento de auditoría con el usuario que ejecutó la acción, el tipo de operación, el recurso afectado y la marca temporal.
3. WHEN se ejecuta una operación de creación, eliminación o asignación de roles, THE Audit_Service SHALL registrar un evento de auditoría con los mismos campos descriptivos.
4. WHEN un acceso es denegado por falta de autorización, THE Audit_Service SHALL registrar un evento de auditoría con la identidad del usuario, el recurso solicitado y el motivo del rechazo.
5. THE Audit_Service SHALL almacenar todos los registros de auditoría en MongoDB.
6. WHEN el Administrador solicita consultar o evidenciar registros básicos de auditoría, THE Audit_Service SHALL retornar registros de auditoría generados por el sistema.

### Requirement 6: Integración con Agente de IA y RAG

**User Story:** Como Usuario_Final autenticado, quiero realizar consultas al agente de IA y recibir respuestas enriquecidas con contexto del sistema, para obtener información relevante de manera inteligente.

#### Acceptance Criteria

1. WHEN un usuario autenticado envía una consulta en lenguaje natural al AI_Service, THE AI_Service SHALL procesar la consulta utilizando un proveedor LLM (OpenAI, Azure OpenAI, Anthropic o Gemini) y retornar una respuesta coherente.
2. THE AI_Service SHALL implementar un pipeline de RAG que recupere información relevante de la Vector_DB antes de enviar la consulta al LLM.
3. THE AI_Service SHALL generar embeddings a partir de la información del sistema e indexarlos en la Vector_DB para su posterior recuperación.
4. WHEN el AI_Service procesa una consulta, THE AI_Service SHALL registrar métricas de latencia de respuesta y costo estimado en tokens.
5. THE AI_Service SHALL aplicar una estrategia de prompt engineering documentada que defina el formato del contexto, las instrucciones del sistema y las restricciones de la respuesta.
6. IF el proveedor LLM no está disponible o retorna un error, THEN THE AI_Service SHALL retornar un mensaje de error descriptivo al usuario con un código HTTP 503.
7. IF el proveedor LLM supera los límites de rate limiting configurados, THEN THE AI_Service SHALL retornar un mensaje indicando que el servicio está temporalmente limitado con un código HTTP 429.
8. THE AI_Service SHALL integrarse con al menos un microservicio del sistema (User_Service, Role_Service o Audit_Service) para obtener datos de contexto.

### Requirement 7: Comunicación entre Microservicios

**User Story:** Como responsable técnico, quiero que los microservicios se comuniquen de forma síncrona mediante REST y de forma asíncrona mediante mensajería, para garantizar desacoplamiento y confiabilidad en la comunicación.

#### Acceptance Criteria

1. THE Sistema SHALL utilizar comunicación REST (HTTP) para operaciones síncronas que requieren respuesta inmediata entre microservicios.
2. THE Sistema SHALL utilizar un Message_Broker (RabbitMQ o Kafka) para publicar y consumir eventos asíncronos entre microservicios.
3. WHEN un microservicio ejecuta una acción auditable, THE microservicio SHALL publicar un evento al Message_Broker que el Audit_Service consumirá para registrar la auditoría.
4. IF un microservicio consumidor no está disponible al momento de publicar un evento, THEN THE Message_Broker SHALL retener el mensaje hasta que el consumidor esté disponible para procesarlo.
5. IF una llamada REST entre microservicios falla por timeout o indisponibilidad del servicio destino, THEN THE microservicio origen SHALL manejar el error sin propagar una falla en cascada.

### Requirement 8: Arquitectura de Microservicios con DDD y Clean Architecture

**User Story:** Como responsable técnico, quiero que cada microservicio siga los principios de DDD y Clean Architecture, para mantener el código organizado, testeable y con bajo acoplamiento.

#### Acceptance Criteria

1. THE Sistema SHALL organizar cada microservicio en capas separadas: dominio, aplicación, infraestructura y presentación (API), con dependencias apuntando hacia el dominio.
2. THE Sistema SHALL aplicar los principios SOLID en la implementación de cada microservicio.
3. THE Sistema SHALL definir entidades, value objects y agregados del dominio en la capa de dominio de cada microservicio, separados de la lógica de infraestructura.
4. THE Sistema SHALL utilizar un ORM (Entity Framework Core, SQLAlchemy o equivalente) para el acceso a la base de datos relacional, encapsulado en la capa de infraestructura.
5. THE Sistema SHALL exponer APIs RESTful necesarias para la comunicación entre Frontend y microservicios.
6. THE Sistema SHALL implementar los microservicios usando uno de los stacks permitidos por la prueba técnica: C# .NET 8+, Python FastAPI o Node.js Express/NestJS.
7. THE Sistema SHALL utilizar SQL Server, MySQL o PostgreSQL para los datos transaccionales.

### Requirement 9: Seguridad del Sistema

**User Story:** Como responsable técnico, quiero que el sistema aplique prácticas de seguridad según OWASP, para proteger los datos y las operaciones contra vulnerabilidades comunes.

#### Acceptance Criteria

1. THE Sistema SHALL validar y sanitizar todas las entradas de datos en cada microservicio antes de procesarlas.
2. THE Sistema SHALL proteger contra inyección SQL utilizando consultas parametrizadas o el ORM configurado.
3. THE Sistema SHALL proteger contra Cross-Site Scripting (XSS) sanitizando las salidas de datos hacia el Frontend.
4. THE Sistema SHALL transmitir tokens y credenciales exclusivamente sobre conexiones HTTPS en producción y mediante headers seguros.
5. THE Sistema SHALL aplicar rate limiting en los endpoints de autenticación para mitigar ataques de fuerza bruta.
6. THE Sistema SHALL no exponer información sensible del sistema (stack traces, versiones internas) en las respuestas de error a los clientes.

### Requirement 10: Frontend Web

**User Story:** Como Usuario_Final, quiero interactuar con el sistema a través de una aplicación web moderna, para gestionar usuarios, roles y realizar consultas al agente de IA de manera visual e intuitiva.

#### Acceptance Criteria

1. THE Frontend SHALL implementarse en React o Angular con TypeScript.
2. THE Frontend SHALL implementar gestión de estado centralizada para manejar el estado de autenticación, datos de usuarios y roles.
3. THE Frontend SHALL mostrar estados de carga durante las operaciones asíncronas contra los microservicios.
4. THE Frontend SHALL mostrar mensajes de error descriptivos cuando una operación falla.
5. THE Frontend SHALL validar los formularios del lado del cliente antes de enviar datos a los microservicios, proporcionando feedback visual inmediato por cada campo inválido.
6. THE Frontend SHALL consumir los endpoints REST de Auth_Service, User_Service, Role_Service, Audit_Service y AI_Service.
7. WHEN un usuario no autenticado intenta acceder a una ruta protegida, THE Frontend SHALL redirigir al usuario a la pantalla de login.
8. WHEN el token de acceso expira durante la sesión del usuario, THE Frontend SHALL redirigir al usuario a la pantalla de login con un mensaje informativo.

### Requirement 11: Testing y Cobertura

**User Story:** Como responsable técnico, quiero que el sistema cuente con tests unitarios con cobertura mínima del 70% en microservicios y tests básicos en el frontend, para asegurar la calidad y confiabilidad del código.

#### Acceptance Criteria

1. THE Sistema SHALL alcanzar una cobertura mínima del 70% en tests unitarios para los microservicios implementados. IF el componente de IA se implementa como microservicio independiente, THEN deberá incluirse en la medición de cobertura. La cobertura DEBE verificarse ejecutando `npm run test:coverage` y confirmando que el reporte generado supera el umbral en cada servicio.
2. THE Frontend SHALL incluir tests de componentes que verifiquen el renderizado correcto y la interacción del usuario con los elementos principales.
3. THE Frontend SHALL incluir tests de lógica de negocio del lado del cliente (validaciones, transformaciones de datos, gestión de estado).
4. THE Sistema SHALL permitir la ejecución de todos los tests mediante un comando único documentado (`npm run test:all`).
5. THE Sistema SHALL generar un reporte de cobertura mediante `npm run test:coverage` que evidencie el cumplimiento del umbral del 70% antes de la entrega.

### Requirement 12: Logging Estructurado

**User Story:** Como responsable técnico, quiero que todos los microservicios generen logs en formato JSON estructurado, para facilitar la depuración y el análisis de comportamiento del sistema.

#### Acceptance Criteria

1. THE Sistema SHALL generar logs en formato JSON estructurado en cada microservicio.
2. THE Sistema SHALL incluir en cada entrada de log los campos: timestamp, nivel de severidad (info, warning, error), nombre del servicio, mensaje descriptivo y correlation ID cuando aplique.
3. WHEN ocurre un error en un microservicio, THE microservicio SHALL registrar un log de nivel error con el detalle de la excepción, el contexto de la operación y el stack trace.
4. WHEN un microservicio recibe una solicitud HTTP, THE microservicio SHALL registrar un log de nivel info con el método HTTP, la ruta, el código de respuesta y el tiempo de procesamiento.

### Requirement 13: Dockerización y Ejecución Local

**User Story:** Como evaluador técnico, quiero ejecutar todo el sistema localmente con un solo comando de Docker Compose, para verificar el funcionamiento integral sin depender de infraestructura externa.

#### Acceptance Criteria

1. THE Sistema SHALL definir un archivo docker-compose.yml que incluya todos los microservicios, el Frontend, las bases de datos (relacional, MongoDB, Redis, Vector_DB) y el Message_Broker.
2. WHEN el evaluador ejecuta `docker-compose up`, THE Sistema SHALL levantar todos los contenedores y sus dependencias en el orden correcto.
3. THE Sistema SHALL configurar health checks en Docker Compose para cada servicio, de modo que los servicios dependientes esperen a que sus dependencias estén saludables antes de iniciar.
4. THE Sistema SHALL funcionar completamente sin requerir cuentas en servicios cloud ni claves de API externas más allá de las configurables en variables de entorno locales para el proveedor LLM.
5. THE Sistema SHALL exponer los puertos necesarios para acceder al Frontend y a las APIs de los microservicios desde la máquina host.

### Requirement 14: Documentación del Sistema

**User Story:** Como evaluador técnico, quiero contar con documentación clara para ejecutar el sistema y comprender la arquitectura, para evaluar la solución sin ambigüedad.

#### Acceptance Criteria

1. THE Sistema SHALL incluir un archivo README con instrucciones paso a paso para levantar el sistema localmente con Docker Compose, incluyendo prerequisitos, configuración de variables de entorno y comandos de ejecución.
2. THE Sistema SHALL incluir documentación de la arquitectura con un diagrama (visual o Mermaid) que muestre los microservicios, bases de datos, Message_Broker y sus interacciones.
3. THE Sistema SHALL incluir documentación de las decisiones técnicas (ADRs o sección equivalente) que justifiquen la elección del stack, patrones y herramientas.
4. THE Sistema SHALL incluir documentación del flujo de datos entre microservicios que explique la comunicación síncrona y asíncrona.
5. THE Sistema SHALL incluir documentación de cómo se aplican DDD y Clean Architecture en la estructura del proyecto.

### Requirement 15: Rendimiento y Caché

**User Story:** Como responsable técnico, quiero que el sistema utilice Redis como caché para reducir la carga en las bases de datos principales y mejorar los tiempos de respuesta, para garantizar un rendimiento adecuado.

#### Acceptance Criteria

1. THE Sistema SHALL utilizar Redis como capa de caché para datos definidos en el diseño técnico como candidatos a caché.
2. WHEN un dato solicitado existe en Redis, THE microservicio correspondiente SHALL retornarlo desde Redis sin consultar la base de datos principal.
3. WHEN un dato es modificado en la base de datos principal, THE microservicio correspondiente SHALL invalidar la entrada correspondiente en Redis.
4. IF Redis no está disponible, THEN THE microservicio correspondiente SHALL continuar operando consultando directamente la base de datos principal sin interrumpir el servicio.

### Requirement 16: Diagnóstico Técnico (Ejercicio Escrito)

**User Story:** Como evaluador técnico, quiero recibir una respuesta escrita sobre un escenario de fallo en producción, para evaluar la capacidad de diagnóstico, comunicación y razonamiento técnico del candidato.

#### Acceptance Criteria

1. THE Entregable SHALL incluir un documento de diagnóstico técnico que presente hipótesis de causa raíz ante un escenario de fallo en producción.
2. THE Entregable SHALL incluir un plan de diagnóstico que utilice logs estructurados y técnicas de debugging.
3. THE Entregable SHALL describir el uso de logs centralizados para correlacionar eventos entre microservicios.
4. THE Entregable SHALL incluir consideraciones sobre latencia de IA, costos de tokens y rate limiting como posibles factores del fallo.
5. THE Entregable SHALL incluir un plan de comunicación con stakeholders durante el incidente.
