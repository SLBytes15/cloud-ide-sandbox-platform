# Multi-stage Dockerfile for @cloud-ide/web
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/

RUN npm install
RUN npm run build:shared
RUN npm run build --workspace=@cloud-ide/web

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
