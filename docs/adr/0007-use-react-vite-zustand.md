# ADR 0007: Usar React + Vite + Zustand para Frontend

## Contexto
Se necesita un frontend SPA TypeScript con gestión de estado, validación de formularios y comunicación con múltiples microservicios.

## Decisión
Usar **React 18** con **TypeScript**, **Vite** como build tool, **Zustand** para estado global, **React Hook Form + Zod** para validación.

## Consecuencias
- Vite: build rápido, HMR instantáneo, configuración mínima
- Zustand: estado global ligero, sin boilerplate, API simple
- React Hook Form + Zod: validación declarativa con type safety
- Axios: interceptors para JWT y manejo global de 401
- Token solo en memoria (Zustand), no en localStorage

## Alternativas Consideradas
- Angular: Más boilerplate, menos flexible para estado
- Redux Toolkit: Más complejo que Zustand para este alcance
- TanStack Query: Opcional, no incluido como obligatorio
