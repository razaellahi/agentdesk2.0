# syntax=docker/dockerfile:1.7
# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && rm -f dist/mockServiceWorker.js dist/config.json

# ---------- runtime ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
RUN apk add --no-cache gettext \
  && rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf.template /etc/nginx/templates/agent-desk.conf.template
COPY docker/config.json.template /opt/agent-desk/config.json.template
COPY docker/05-agent-desk-env.envsh /docker-entrypoint.d/05-agent-desk-env.envsh
COPY docker/entrypoint.sh /docker-entrypoint.d/40-agent-desk.sh
COPY --from=build /app/dist /usr/share/nginx/app
RUN chmod +x /docker-entrypoint.d/40-agent-desk.sh /docker-entrypoint.d/05-agent-desk-env.envsh \
  && chown -R 101:0 /usr/share/nginx /etc/nginx/conf.d \
  && chmod -R g+w /usr/share/nginx /etc/nginx/conf.d
USER 101
EXPOSE 8080
ENV BASE_PATH=/agent-desk/ FRAME_ANCESTORS=""
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
