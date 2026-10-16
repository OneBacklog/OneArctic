#!/usr/bin/env bash
set -euo pipefail

# Validate APP_ENV
if [ -z "${APP_ENV:-}" ]; then
  echo "Error: APP_ENV is required."
  echo ""
  echo "  APP_ENV=production bash setup.sh"
  echo "  APP_ENV=development bash setup.sh"
  echo ""
  exit 1
fi

if [ "$APP_ENV" != "development" ] && [ "$APP_ENV" != "production" ]; then
  echo "Error: APP_ENV must be 'development' or 'production', got '${APP_ENV}'."
  exit 1
fi

echo "Setting up OneArctic (${APP_ENV})..."

# Ensure openssl is available for key generation
if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required but not installed."
  exit 1
fi

# Everything in data/ should belong to the person running setup, even under sudo.
# Root itself maps to 1000, the default user the containers fall back to.
if [ "$(id -u)" = "0" ]; then
  owner_uid="${SUDO_UID:-1000}"
  owner_gid="${SUDO_GID:-1000}"
else
  owner_uid="$(id -u)"
  owner_gid="$(id -g)"
fi

# Create data directories
mkdir -p data/db data/files data/meili
chmod 755 data/db data/files data/meili 2>/dev/null || true
if [ "$(id -u)" = "0" ]; then
  chown -R "${owner_uid}:${owner_gid}" data
fi
echo "✓ Data directories ready"

# Copy .env.example if .env doesn't exist
if [ -f .env ]; then
  echo "✓ .env already exists, skipping"
else
  cp .env.example .env
  echo "✓ .env created from .env.example"
fi

# Write KEY=value to .env, adding the line if the key is missing (e.g. an older .env)
write_env() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" .env
    else
      sed -i "s|^${key}=.*|${key}=${value}|" .env
    fi
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

# Set a key in .env — only if it is missing or empty
set_env() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=.+" .env; then
    echo "✓ ${key} already set, skipping"
  else
    write_env "$key" "$value"
    echo "✓ ${key} set"
  fi
}

# Set a key in .env — always overwrites
force_env() {
  local key="$1"
  local value="$2"
  write_env "$key" "$value"
  echo "✓ ${key} set to '${value}'"
}

# Always generate secrets if empty
set_env "JWT_SECRET" "$(openssl rand -hex 32)"
set_env "MEILI_MASTER_KEY" "$(openssl rand -hex 16)"

if [ "$APP_ENV" = "development" ]; then
  force_env "COOKIE_SECURE" "false"
else
  force_env "COOKIE_SECURE" "true"
fi

# The containers run as this user, so the files they write in data/ belong to you
force_env "PUID" "$owner_uid"
force_env "PGID" "$owner_gid"

# Files written by an older setup (or by containers running as root) need a one-time fix
if [ -n "$(find data \( ! -user "$owner_uid" -o ! -group "$owner_gid" \) -print -quit 2>/dev/null)" ]; then
  echo ""
  echo "! Some files in data/ are owned by another user. Fix them once with:"
  echo ""
  echo "  sudo chown -R ${owner_uid}:${owner_gid} data"
fi

echo ""
echo "Done! Start the app with:"
echo ""
if [ "$APP_ENV" = "development" ]; then
  echo "  docker compose -f compose.dev.yaml up -d"
else
  echo "  docker compose up -d"
fi
echo ""
