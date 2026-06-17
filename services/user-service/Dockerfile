# Multi-stage Dockerfile for User Service
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY services/user-service/package.json ./services/user-service/

RUN npm install --legacy-peer-deps --workspace=@user-management/user-service --workspace=@user-management/shared --include-workspace-root

COPY shared/ ./shared/
COPY services/user-service/ ./services/user-service/
COPY tsconfig.base.json ./

RUN cd services/user-service && npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/services/user-service/package.json ./services/user-service/

RUN npm install --legacy-peer-deps --workspace=@user-management/user-service --workspace=@user-management/shared --include-workspace-root --omit=dev

COPY --from=builder /app/shared/src ./shared/src
COPY --from=builder /app/services/user-service/dist ./services/user-service/dist

WORKDIR /app/services/user-service

EXPOSE 3002
ENV PORT=3002
CMD ["node", "dist/main.js"]
