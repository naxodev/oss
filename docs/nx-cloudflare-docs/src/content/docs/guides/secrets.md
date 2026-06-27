---
title: Manage Worker secrets
description: Set, list, and remove a deployed Worker's secrets with the inferred secret targets, plus .dev.vars for local development.
---

import { Steps, Aside } from '@astrojs/starlight/components';

Every Worker gets `secret-put`, `secret-bulk`, `secret-list`, and `secret-delete` targets that wrap `wrangler secret`. They manage the secrets bound to your **deployed** Worker. Secret values are never passed as command arguments — `secret-put` prompts for them, and `secret-bulk` reads them from a file.

## Before you start

- A Worker project. Scaffold one with the [application generator](/guides/generators-application).
- Authenticated Wrangler (`wrangler login`) for the account the Worker deploys to.

## Local development secrets

`nx serve` (`wrangler dev`) reads local secrets from a `.dev.vars` file at the Worker root — no target needed. The file stays on your machine; it is never uploaded.

```ini title=".dev.vars"
API_KEY=local-dev-key
```

<Aside type="caution">Add `.dev.vars` and any secrets file to `.gitignore`. Never commit secret values.</Aside>

## Steps

These targets act on the deployed Worker.

<Steps>

1. **Set one secret**

   ```bash
   bunx nx secret-put my-worker --name=API_KEY
   ```

   `secret-put` prompts for the value, then uploads it to the deployed Worker.

2. **Set many at once**

   Put every key in a JSON file:

   ```json title="secrets.json"
   {
     "API_KEY": "…",
     "DATABASE_URL": "…"
   }
   ```

   ```bash
   bunx nx secret-bulk my-worker --file=secrets.json
   ```

   Each key becomes a secret on the Worker. Do not commit this file.

3. **List the Worker's secrets**

   ```bash
   bunx nx secret-list my-worker
   ```

   Only the names are returned — values are never exposed.

4. **Delete a secret**

   ```bash
   bunx nx secret-delete my-worker --name=API_KEY
   ```

   This removes the secret from the deployed Worker.

</Steps>

## Variations

### Target an environment

Every secret target accepts `--env` for a [Wrangler environment](https://developers.cloudflare.com/workers/wrangler/environments/):

```bash
bunx nx secret-put my-worker --name=API_KEY --env=production
```

## Verify

`secret-list` shows the secret you set:

```bash
bunx nx secret-list my-worker
```

## Next steps

- [Run D1 migrations](/guides/d1-migrations) — the other Day-2 workflow
- [Inferred targets](/inferred-targets) — the full `secret-*` target and option reference
- [application generator](/guides/generators-application) — scaffold a Worker
