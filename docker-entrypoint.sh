#!/bin/sh
set -e

# Bind-mounted data directories can be root-owned (e.g. created by Docker on first run).
# Hand them to the unprivileged user, then drop privileges.
if [ "$(id -u)" = "0" ]; then
  for dir in "$(dirname "${DATABASE_PATH:-/app/data/db/onearctic.db}")" "${FILES_PATH:-/app/data/files}"; do
    mkdir -p "$dir"
    find "$dir" ! -user node -exec chown node:node {} +
  done
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
