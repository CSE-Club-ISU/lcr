FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Vite reads VITE_* env vars at build time and bakes them into the bundle.
# Without these ARGs the production build falls back to localhost defaults
# and the deployed client points at the developer's machine instead of EC2.
ARG VITE_SPACETIMEDB_URI
ARG VITE_AUTH_SERVER_URL
ARG VITE_EXECUTOR_URL
ARG VITE_MODULE_NAME
ENV VITE_SPACETIMEDB_URI=$VITE_SPACETIMEDB_URI
ENV VITE_AUTH_SERVER_URL=$VITE_AUTH_SERVER_URL
ENV VITE_EXECUTOR_URL=$VITE_EXECUTOR_URL
ENV VITE_MODULE_NAME=$VITE_MODULE_NAME

COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
