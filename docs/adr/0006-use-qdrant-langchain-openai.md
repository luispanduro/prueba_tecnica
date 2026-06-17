# ADR 0006: Usar Qdrant + LangChain.js + OpenAI para RAG

## Contexto
Se necesita implementar RAG básico: indexar datos del sistema, buscar por similaridad y generar respuestas con LLM.

## Decisión
Usar **Qdrant** como vector DB, **LangChain.js** como framework de orquestación y **OpenAI** como proveedor LLM (configurable por variables de entorno).

## Consecuencias
- Qdrant: open source, imagen Docker liviana, API REST nativa
- LangChain.js: integración nativa TypeScript, soporte múltiples proveedores
- OpenAI: API madura, configurable para cambiar modelo/proveedor
- Pipeline documentado: indexación → retrieval → prompt assembly → LLM
- Métricas de latencia y costo registradas en logs

## Alternativas Consideradas
- Chroma: Viable pero Qdrant tiene mejor API REST
- Semantic Kernel: Más orientado a .NET
- Pinecone: SaaS, no ejecutable localmente sin cuenta
