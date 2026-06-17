# Multi-stage Dockerfile for Role Service
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY services/role-service/package.json ./services/role-service/

RUN npm install --legacy-peer-deps --workspace=@user-management/role-service --workspace=@user-management/shared --include-workspace-root

COPY shared/ ./shared/
COPY services/role-service/ ./services/role-service/
COPY tsconfig.base.json ./

RUN cd services/role-service && npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/services/role-service/package.json ./services/role-service/

RUN npm install --legacy-peer-deps --workspace=@user-management/role-service --workspace=@user-management/shared --include-workspace-root --omit=dev

COPY --from=builder /app/shared/src ./shared/src
COPY --from=builder /app/services/role-service/dist ./services/role-service/dist

WORKDIR /app/services/role-service

EXPOSE 3003
ENV PORT=3003
CMD ["node", "dist/main.js"]
