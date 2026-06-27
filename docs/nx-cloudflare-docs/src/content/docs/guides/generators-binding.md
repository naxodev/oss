---
title: binding generator
description: Add a binding (KV, R2, D1, Durable Object, Queue, Workflow, or Service/RPC) to an existing Worker.
---

The `binding` generator wires a binding into an existing Worker: it edits the Worker's `wrangler.jsonc`, stubs any required code (Durable Object / Workflow classes, a queue consumer) and migrations, emits a matching test, and refreshes the generated `Env` types via `wrangler types`.

It targets an **existing** Worker — scaffold one first with the [application generator](/guides/generators-application).

## Usage

```bash
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=kv --binding=MY_KV --id=<namespace-id>
```

`binding` is the `Env` key your Worker reads (`env.MY_KV`), in `SCREAMING_SNAKE_CASE`.

## Binding types

| Type       | What it adds                                                                                      | Requires                         |
| ---------- | ------------------------------------------------------------------------------------------------- | -------------------------------- |
| `kv`       | A `kv_namespaces[]` entry.                                                                        | `--id` (or `--create`)           |
| `r2`       | An `r2_buckets[]` entry.                                                                          | `--bucketName` (or `--create`)   |
| `d1`       | A `d1_databases[]` entry.                                                                         | `--databaseName` (or `--create`) |
| `do`       | A `durable_objects.bindings[]` entry **+** a `[[migrations]]` tag, a class stub, and a re-export. | `--name` (the class name)        |
| `queue`    | A `queues.producers[]` **+** `queues.consumers[]` entry, and injects a `queue()` handler.         | `--name` (the queue name)        |
| `workflow` | A `workflows[]` entry **+** a `WorkflowEntrypoint` class stub and a re-export.                    | `--name` (the class name)        |
| `service`  | A `services[]` entry referencing another Worker.                                                  | `--name` (the target service)    |

### KV / R2 / D1

Config-only bindings. Pass the existing resource id/name, or `--create` to provision it:

```bash
# KV with an existing namespace
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=kv --binding=CACHE --id=abc123

# R2, provisioning the bucket via the Wrangler CLI
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=r2 --binding=ASSETS --create

# D1 with an existing database
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=d1 --binding=DB --databaseName=app-db --id=<database-id>
```

### Durable Objects

```bash
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=do --binding=COUNTER --name=Counter
```

Writes `src/counter.ts` (a `DurableObject<Env>` subclass), re-exports it from `src/index.ts` (Wrangler requires the class to be exported from the Worker's entrypoint), and appends a SQLite migration with an incremented `tag` (`v1`, `v2`, …).

### Queues

```bash
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=queue --binding=JOBS --name=jobs-queue
```

Adds both a producer and a consumer for the queue, and injects an `async queue(batch, env, ctx)` handler into the Worker's default export. A Worker has a single `queue()` handler that receives batches from all of its queue consumers — if one already exists, it's left untouched.

### Workflows

```bash
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=workflow --binding=MY_WORKFLOW --name=MyWorkflow
```

### Service bindings (RPC)

```bash
bunx nx g @naxodev/nx-cloudflare:binding --project=my-worker --type=service --binding=AUTH --name=auth-worker
```

## Options

| Option         | Type                                                               | Default      | Description                                                                                      |
| -------------- | ------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------ |
| `project`      | string                                                             | _(required)_ | The target Worker project. Defaults to the first positional argument's project.                  |
| `type`         | `kv` \| `r2` \| `d1` \| `do` \| `queue` \| `workflow` \| `service` | _(required)_ | The kind of binding to add.                                                                      |
| `binding`      | string                                                             | _(required)_ | The `Env` key (`SCREAMING_SNAKE_CASE`) the Worker uses to access the binding, e.g. `MY_KV`.      |
| `name`         | string                                                             |              | Required for `do`/`workflow` (the class name), `queue` (the queue name), and `service` (target). |
| `id`           | string                                                             |              | Existing KV namespace id or D1 database id. Ignored when `--create` is set.                      |
| `databaseName` | string                                                             |              | D1 database name. Required for `--type=d1` without `--create`.                                   |
| `bucketName`   | string                                                             |              | R2 bucket name. Required for `--type=r2` without `--create`.                                     |
| `create`       | boolean                                                            | `false`      | Provision the remote resource via the Wrangler CLI (KV/R2/D1/Queue only) and fill in the id.     |
| `skipTests`    | boolean                                                            | `false`      | Skip generating a Vitest spec for the binding stub.                                              |
| `skipFormat`   | boolean                                                            | `false`      | Skip formatting files.                                                                           |
| `skipTypegen`  | boolean                                                            | `false`      | Skip auto-running `wrangler types` — the `Env` interface will not be refreshed.                  |

## Notes

- **JSONC only.** The generator edits `wrangler.jsonc`/`wrangler.json` while preserving comments and formatting. `wrangler.toml` is rejected with a pointer to convert first.
- **`wrangler types` runs automatically** after the binding is written so `Env` picks up the new binding. Pass `--skipTypegen` to opt out (run `nx run <project>:typegen` yourself later).
- **`--create`** is only valid for KV/R2/D1/Queue — Durable Objects and Workflows are code in your Worker, and a Service binding references another Worker, so none of them are provisioned resources. On a provisioning failure the generator fails loudly and leaves a placeholder in the config.
- **Duplicate bindings are rejected**, never overwritten. The generator also rejects a Durable Object whose class name is already defined by an existing binding or migration.

## Verify

The Worker's `wrangler.jsonc` now contains the new entry — for `--type=kv`, a `kv_namespaces` array holding your `binding`. Unless you passed `--skipTypegen`, the regenerated `Env` (via `wrangler types`) includes it too.

## Next steps

- [application generator](/guides/generators-application) — scaffold a Worker application
- [Inferred targets](/inferred-targets) — `serve`, `deploy`, `typegen`, and more
- [Wrangler configuration](/understanding/wrangler) — how the plugin reads `wrangler.jsonc`
