# OneArctic

OneArctic is a self-hosted and single-user Google Keep-style note app. Built with Nuxt, SQLite, and Meilisearch.

## Screenshots

TBA

## Requirements

- Docker and Docker Compose v2

## Production (Docker)

1. Clone the repo:

```bash
git clone https://github.com/OneBacklog/OneArctic
cd OneArctic
```

2. Generate secrets and create data folders:

```bash
APP_ENV=production bash setup.sh
```

### IMPORTANT!

It is recommended to serve the app over HTTPS, but if somehow you don't, change `COOKIE_SECURE` to `false` in `.env` file.

3. Start the services:

```bash
docker compose up -d
```

### REVERSE PROXY!

See [compose.traefik.yaml](./compose.traefik.yaml) for Traefik compose file example.

The app will be available at `http://localhost:3000`.

4. After the app is running, generate your OTP secret:

```bash
docker compose run --rm setup-auth
```

5. Reset the OTP secret (generates a new key) if somehow you lose it:

```bash
docker compose run --rm -e RESET=1 setup-auth
```

## Configuration (Optional)

The app reads secrets from `.env` (created by `setup.sh`).

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Secret for signing auth tokens (min 32 chars). |
| `MEILI_MASTER_KEY` | Yes | Meilisearch master key. |
| `COOKIE_SECURE` | Yes | Use secure cookies (HTTPS). |
| `PORT` | Yes | Host port for the app. Default `3000`. |
| `DATABASE_PATH` | Yes | SQLite database file path. |
| `FILES_PATH` | Yes | Attachments storage path. |
| `MEILISEARCH_HOST` | Yes | Meilisearch HTTP endpoint. |

## Data Location

All data is stored under `./data/`:

```
data/
  db/      — SQLite Database
  files/   — Uploaded Images and Files
  meili/   — Meilisearch Index
```

Back up the entire `data/` directory to migrate your instance.

## Update

```bash
docker compose pull
docker compose up -d
```

## Local Development

See [DEVELOPMENT.md](./DEVELOPMENT.md)
