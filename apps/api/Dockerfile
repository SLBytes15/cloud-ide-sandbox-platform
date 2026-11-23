# Multi-stage Dockerfile for @cloud-ide/api
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/ services/
COPY apps/api/ apps/api/

RUN npm install
RUN npm run build:shared
RUN npm run build --workspace=@cloud-ide/execution
RUN npm run build --workspace=@cloud-ide/api

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/execution/package.json ./services/execution/
COPY apps/api/package.json ./apps/api/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/execution/dist ./services/execution/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 5001
CMD ["node", "apps/api/dist/server.js"]
