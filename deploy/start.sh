#!/bin/sh
set -eu

NGINX_PID=""
CITY_PID=""
API_PID=""

terminate() {
  trap - TERM INT EXIT
  for pid in "$NGINX_PID" "$CITY_PID" "$API_PID"; do
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  for pid in "$NGINX_PID" "$CITY_PID" "$API_PID"; do
    if [ -n "$pid" ]; then
      wait "$pid" 2>/dev/null || true
    fi
  done
}

trap terminate TERM INT EXIT

cd /app/chat-debate
/opt/venv/bin/python server/dev_api.py &
API_PID=$!

cd /app/city
HOSTNAME=127.0.0.1 PORT=3002 node server.js &
CITY_PID=$!

nginx -c /app/deploy/nginx.conf -g "daemon off;" &
NGINX_PID=$!

while kill -0 "$NGINX_PID" 2>/dev/null && kill -0 "$CITY_PID" 2>/dev/null && kill -0 "$API_PID" 2>/dev/null; do
  sleep 2
done

exit 1
