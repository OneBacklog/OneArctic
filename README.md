# OneArctic

[![CI](https://github.com/OneBacklog/OneArctic/actions/workflows/ci.yaml/badge.svg)](https://github.com/OneBacklog/OneArctic/actions/workflows/ci.yaml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)

OneArctic is a self-hosted and single-user Google Keep-style note app. Built with Nuxt, SQLite, and Meilisearch.

## Features

- Text and checklist notes in a masonry grid
- Labels with drag-and-drop ordering
- Archive and trash
- Full-text search powered by Meilisearch
- Image and file attachments with thumbnails and a lightbox
- Real-time sync across open tabs and devices
- Installable as a PWA
- Login with a TOTP authenticator app (no password to leak)
- All data stored locally in SQLite and plain files

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

> [!IMPORTANT]
> It is recommended to serve the app over HTTPS. If you don't, change `COOKIE_SECURE` to `false` in the `.env` file.

3. Start the services:

```bash
docker compose up -d
```

The app will be available at `http://localhost:3000`.

4. After the app is running, generate your OTP secret:

```bash
docker compose run --rm setup-auth
```

5. Reset the OTP secret (generates a new key) if somehow you lose it:

```bash
docker compose run --rm -e RESET=1 setup-auth
```

### Reverse Proxy

See [compose.traefik.yaml](./compose.traefik.yaml) for a Traefik example.

## Configuration (Optional)

The app reads secrets from `.env` (created by `setup.sh`).

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Secret for signing auth tokens (min 32 chars). |
| `MEILI_MASTER_KEY` | Yes | Meilisearch master key. |
| `COOKIE_SECURE` | No | Use secure cookies (HTTPS). Defaults to `true`; set to `false` when serving over plain HTTP. |
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

## Backup and Restore

Everything lives in `data/`, so a backup is a copy of that directory. Stop the app first so the SQLite database is in a consistent state:

```bash
docker compose stop app
tar czf onearctic-backup-$(date +%F).tar.gz data/
docker compose start app
```

To restore, stop the services, replace `data/` with the contents of the archive, and start them again. Keep `data/meili/` in the backup too: without it, search only finds notes edited after the restore.

## Update

```bash
docker compose pull
docker compose up -d
```

## Contributing

See [DEVELOPMENT.md](./DEVELOPMENT.md) for local setup and [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines. Please report security issues privately as described in [SECURITY.md](./SECURITY.md).

## License

OneArctic is licensed under the [GNU Affero General Public License v3.0](./LICENSE).
