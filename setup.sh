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

# Create data directories
mkdir -p data/db data/files data/meili
chmod 755 data/db data/files data/meili
echo "✓ Data directories ready"

# Copy .env.example if .env doesn't exist
if [ -f .env ]; then
  echo "✓ .env already exists, skipping"
else
  cp .env.example .env
  echo "✓ .env created from .env.example"
fi

# Set a key in .env — only overwrites if the value is currently empty
set_env() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=\s*$" .env 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" .env
    else
      sed -i "s|^${key}=.*|${key}=${value}|" .env
    fi
    echo "✓ ${key} set"
  else
    echo "✓ ${key} already set, skipping"
  fi
}

# Set a key in .env — always overwrites
force_env() {
  local key="$1"
  local value="$2"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" .env
  else
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  fi
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

echo ""
echo "Done! Start the app with:"
echo ""
if [ "$APP_ENV" = "development" ]; then
  echo "  docker compose -f compose.dev.yaml up -d"
else
  echo "  docker compose up -d"
fi
echo ""
