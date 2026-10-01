#!/bin/sh
# Renders runtime config and mounts the app under BASE_PATH (runs after
# 05-agent-desk-env.envsh and nginx's template rendering).
set -eu

APP=/usr/share/nginx/app
WEBROOT=/usr/share/nginx/html

# 1. config.json from the environment; unset variables render empty -> app defaults.
envsubst < /opt/agent-desk/config.json.template > "$APP/config.json"

# 2. <base href> so relative asset URLs resolve under BASE_PATH.
sed -i "s#<base href=\"[^\"]*\"#<base href=\"$BASE_PATH\"#" "$APP/index.html"

# 3. Expose the app at BASE_PATH (e.g. /agent-desk -> /usr/share/nginx/app).
mkdir -p "$(dirname "$WEBROOT$BASE_PATH_NOSLASH")"
ln -sfn "$APP" "$WEBROOT$BASE_PATH_NOSLASH"

echo "agent-desk: config rendered, serving at $BASE_PATH"
