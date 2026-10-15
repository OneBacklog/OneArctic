# Development

## Requirements

- Docker and Docker Compose v2, **or**
- Node.js 24 (see `.nvmrc`) and a running Meilisearch instance

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

## Development (Node.js)

1. Install dependencies:

```bash
npm install
```

2. Start Meilisearch:

```bash
docker run -d --name onearctic-meili -p 7700:7700 \
  -e MEILI_MASTER_KEY=dev-master-key -e MEILI_NO_ANALYTICS=true \
  getmeili/meilisearch:v1.38.2
```

3. Create `.env` from `.env.example` with local paths:

```bash
JWT_SECRET=<output of: openssl rand -hex 32>
MEILI_MASTER_KEY=dev-master-key
COOKIE_SECURE=false
DATABASE_PATH=./data/db/onearctic.db
FILES_PATH=./data/files
MEILISEARCH_HOST=http://localhost:7700
```

4. Start the dev server, then create your OTP secret in another terminal:

```bash
npm run dev
node --env-file=.env scripts/setup-auth.mjs
```

## Checks

Run these before opening a pull request (CI runs them too):

```bash
npm run lint        # ESLint (use lint:fix to auto-fix)
npm run typecheck   # vue-tsc
npm test            # unit tests and API tests against a production build
npm run build       # production build
```

### Tests

- `test/unit/` covers pure logic (schemas, file type detection, login throttling). Run just these with `npm run test:unit`.
- `test/e2e/` builds the app, starts it on a temporary database and exercises the API.
- Search tests are skipped unless a Meilisearch instance is available:

```bash
MEILISEARCH_TEST_HOST=http://localhost:7700 MEILISEARCH_TEST_KEY=dev-master-key npm test
```

## Database Migrations

Migrations in `server/database/migrations/` run automatically on startup.

Generate a migration after editing `server/database/schema.ts`:

```bash
npm run db:generate -- --name=<migration-name>
```

Open the DB inspector:

```bash
npm run db:studio
```
