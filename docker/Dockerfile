# Runtime-only image used by GitLab CI: the pipeline builds `dist` in the
# artifacts stage and copies it next to this file (same flow as unified-agent).
# For a self-contained local build use the multi-stage ../Dockerfile.
FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
RUN apk upgrade --no-cache && apk add --no-cache gettext tzdata \
  && rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/agent-desk.conf.template
COPY config.json.template /opt/agent-desk/config.json.template
COPY 05-agent-desk-env.envsh /docker-entrypoint.d/05-agent-desk-env.envsh
COPY entrypoint.sh /docker-entrypoint.d/40-agent-desk.sh
COPY dist/ /usr/share/nginx/app/
RUN rm -f /usr/share/nginx/app/mockServiceWorker.js /usr/share/nginx/app/config.json \
  && chmod +x /docker-entrypoint.d/40-agent-desk.sh /docker-entrypoint.d/05-agent-desk-env.envsh \
  && chown -R 101:0 /usr/share/nginx /etc/nginx/conf.d \
  && chmod -R g+w /usr/share/nginx /etc/nginx/conf.d
USER 101
EXPOSE 8080
ENV BASE_PATH=/agent-desk/ FRAME_ANCESTORS=""
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
