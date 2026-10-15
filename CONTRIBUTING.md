# Contributing to OneArctic

Thanks for your interest in contributing! Bug reports, feature ideas and pull requests are all welcome.

## Reporting Bugs and Requesting Features

- Search [existing issues](https://github.com/OneBacklog/OneArctic/issues) first.
- Use the issue templates and include your version (image tag or commit) and steps to reproduce.
- For security issues, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## Development Setup

See [DEVELOPMENT.md](./DEVELOPMENT.md) for running the app with Docker or directly with Node.js.

## Project Structure

```
app/        Nuxt frontend (components, composables, pages)
server/     Nitro backend (API routes, middleware, database, services)
shared/     Types and helpers used by both app/ and server/
scripts/    Standalone CLI scripts (e.g. OTP setup)
```

## Pull Requests

1. Fork the repo and create a branch from `master`.
2. Keep pull requests focused on one change.
3. If you change `server/database/schema.ts`, generate a migration with `npm run db:generate -- --name=<migration-name>` and commit it.
4. Make sure these pass locally before opening the PR:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

5. Fill in the pull request template and describe how you tested the change.

## Commit Messages

Use a short, imperative, Title Case subject line, for example:

```
Add Label Reordering
Fix Upload Size Check
```

## Code Style

- TypeScript everywhere; avoid `any` (the linter enforces this).
- Match the style of the surrounding code. Run `npm run lint:fix` to auto-fix what ESLint can.
- Put types, constants and validation schemas used by both the client and the server in `shared/`.
- Add or update tests for behavior changes (`test/unit/` for pure logic, `test/e2e/` for API behavior).

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0](./LICENSE) license.
