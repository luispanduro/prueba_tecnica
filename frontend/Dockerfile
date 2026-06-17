# Multi-stage Dockerfile for Frontend (React SPA)
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build-time environment variables for Vite
ARG VITE_API_BASE_URL=http://localhost:3001
ARG VITE_AUTH_API_URL=http://localhost:3001
ARG VITE_USER_API_URL=http://localhost:3002
ARG VITE_ROLE_API_URL=http://localhost:3003
ARG VITE_AUDIT_API_URL=http://localhost:3004
ARG VITE_AI_API_URL=http://localhost:3005

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL
ENV VITE_USER_API_URL=$VITE_USER_API_URL
ENV VITE_ROLE_API_URL=$VITE_ROLE_API_URL
ENV VITE_AUDIT_API_URL=$VITE_AUDIT_API_URL
ENV VITE_AI_API_URL=$VITE_AI_API_URL

COPY package.json package-lock.json* ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

# Production image with Nginx
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
