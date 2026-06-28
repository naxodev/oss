---
title: Run D1 migrations
description: Create and apply D1 database migrations for a Worker with the inferred d1 target's create, apply, and list configurations.
---

import { Steps, Aside } from '@astrojs/starlight/components';

For each D1 binding in a Worker's `wrangler.jsonc`, the plugin infers a `d1` target with `create`, `apply`, and `list` configurations that wrap `wrangler d1 migrations`. Use them to evolve your D1 schema from local development through to production.

## Before you start

- A Worker with a D1 binding in `wrangler.jsonc`. Add one with the [binding generator](/guides/generators-binding): `bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=d1 --binding=DB --databaseName=app-db --id=<database-id>`.
- D1 targets are inferred from `wrangler.jsonc`/`wrangler.json` only — not `wrangler.toml`.

## Steps

<Steps>

1. **Create a migration**

   ```bash
   bunx nx run my-worker:d1:create --message=create_users
   ```

   This writes a timestamped `.sql` file in the database's migrations directory (`migrations/` by default).

2. **Write the SQL**

   Edit the generated file under `migrations/`:

   ```sql title="migrations/0001_create_users.sql"
   CREATE TABLE users (
     id INTEGER PRIMARY KEY,
     email TEXT NOT NULL UNIQUE
   );
   ```

3. **Apply locally**

   ```bash
   bunx nx run my-worker:d1:apply
   ```

   `d1:apply` defaults to `--local`, so this runs against the local database used by `nx run my-worker:serve` (`wrangler dev`).

4. **Apply to production**

   ```bash
   bunx nx run my-worker:d1:apply --remote
   ```

   The `--remote` flag runs the pending migrations against the live D1 database.

</Steps>

## Variations

### List pending migrations

```bash
bunx nx run my-worker:d1:list            # local
bunx nx run my-worker:d1:list --remote   # remote
```

### Multiple D1 databases

When a Worker declares more than one `d1_databases` binding, select which one a command targets with `--db=<binding>`:

```bash
bunx nx run my-worker:d1:apply --db=ANALYTICS --remote
```

With a single D1 database, `--db` is optional. With multiple, omitting it errors and lists the valid bindings.

### Target an environment

Any `d1:apply`/`d1:list` invocation accepts `--env` for a [Wrangler environment](https://developers.cloudflare.com/workers/wrangler/environments/):

```bash
bunx nx run my-worker:d1:apply --remote --env=production
```

### Apply migrations during deploy

The plugin does not chain migrations into `deploy` automatically. To apply before deploying in CI, run them in sequence:

```bash
bunx nx run my-worker:d1:apply --remote && bunx nx run my-worker:deploy
```

## Verify

After applying, `d1:list` reports no pending migrations:

```bash
bunx nx run my-worker:d1:list --remote
```

## Next steps

- [Manage Worker secrets](/guides/secrets) — the other Day-2 workflow
- [binding generator](/guides/generators-binding) — add the D1 binding these targets operate on
- [Inferred targets](/inferred-targets) — the full `d1` target and option reference
