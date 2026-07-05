---
title: Enable observability and Smart Placement
description: Turn on Workers logs (observability.enabled) and Smart Placement (placement.mode = "smart"), at scaffold time or on an existing Worker.
---

import { Steps, Aside } from '@astrojs/starlight/components';

Two production-readiness settings are opt-in because they change how your Worker is observed and placed:

- **Observability** (`observability.enabled = true`) retains your Worker's logs so you can query them in the dashboard.
- **Smart Placement** (`placement.mode = "smart"`) lets Cloudflare run your Worker in the location closest to the backend it talks to most.

Both write into `wrangler.jsonc` (or `wrangler.json`); comments and formatting are preserved.

## At scaffold time

Pass the flags to the [application generator](/guides/generators-application):

```bash
bunx nx g @naxodev/nx-cloudflare:application apps/my-worker --type=hello-world --observability --smartPlacement
```

## On an existing Worker

Use the `worker-config` generator:

<Steps>

1. **Enable observability**

   ```bash
   bunx nx g @naxodev/nx-cloudflare:worker-config --project=my-worker --observability
   ```

2. **Enable Smart Placement**

   ```bash
   bunx nx g @naxodev/nx-cloudflare:worker-config --project=my-worker --smartPlacement
   ```

You can pass both flags at once. At least one is required.

</Steps>

<Aside>These generators only edit `wrangler.jsonc`/`wrangler.json`. A Worker on `wrangler.toml` must be converted first.</Aside>

## Verify

Open `wrangler.jsonc` — you should see:

```jsonc
{
  "observability": { "enabled": true },
  "placement": { "mode": "smart" }
}
```

## Next steps

- [Cloudflare: Workers observability](https://developers.cloudflare.com/workers/observability/)
- [Cloudflare: Smart Placement](https://developers.cloudflare.com/workers/configuration/smart-placement/)
- [Manage Worker secrets](/guides/secrets)
