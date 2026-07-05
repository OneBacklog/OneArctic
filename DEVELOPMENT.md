## Requirements

- Docker and Docker Compose v2

## Development (Docker)

1. Clone the repo:

```bash
git clone https://github.com/OneBacklog/OneArctic
cd OneArctic
```

2. Generate secrets and create data folders:

```bash
APP_ENV=development bash setup.sh
```

3. Start the services:

```bash
docker compose -f compose.dev.yaml up -d --build
```

The app will run at `http://localhost:3000` with hot reload on `app/` and `server/`.

4. After the app is running, generate your OTP secret:

```bash
docker compose -f compose.dev.yaml run --rm setup-auth
```

5. Reset the OTP secret (generates a new key) if somehow you lose it:

```bash
docker compose -f compose.dev.yaml run --rm -e RESET=1 setup-auth
```

### Common Commands

```bash
docker compose -f compose.dev.yaml restart app
docker compose -f compose.dev.yaml logs -f app
docker compose -f compose.dev.yaml down
```

## Database Migrations

Migrations in `server/database/migrations/` run automatically on startup.

Generate a migration after editing `server/database/schema.ts`:

```bash
npx drizzle-kit generate --name=<migration-name>
```

Open the DB inspector:

```bash
npx drizzle-kit studio
```
