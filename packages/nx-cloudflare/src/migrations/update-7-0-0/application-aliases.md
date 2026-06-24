# The `application` generator now aliases `create-cloudflare`

`@naxodev/nx-cloudflare` 7.0.0 **replaces the old `application` generator with
`create-cloudflare`** (C3), exposed under the `application`/`app`/`c3` aliases
(#159). Generating a Worker now shells out to Cloudflare's `create-cloudflare`
scaffolder and makes the result Nx-ready, instead of using the plugin's own
hand-written templates.

This change has **no effect on already-generated projects** — their source code
is untouched, and the companion `update-7-0-0-move-to-inference` migration
already converts their `serve`/`deploy` targets to the inference plugin. There
is nothing to rewrite on disk, so this migration is informational only.

## What changed

- `nx g @naxodev/nx-cloudflare:application` (and `:app`) now resolve to the new
  `create-cloudflare` generator. The command still works; its **options and
  output differ** from the pre-7.0.0 generator.
- The previous `application` generator's bespoke schema (and its template-driven
  output) is gone. Flags that existed only on the old generator are no longer
  accepted.

## What to do

Only relevant if you **script** Worker generation (CI, repo generators, docs):

1. **Re-check any scripted `application` invocation.** Run
   `nx g @naxodev/nx-cloudflare:create-cloudflare --help` and update flags to the
   `create-cloudflare` schema. Options that were specific to the old generator
   will error or be ignored.
2. **Expect C3-shaped output.** New Workers are scaffolded by `create-cloudflare`
   (different file layout, dependencies, and `wrangler.jsonc` defaults) rather
   than the old templates. Adjust downstream assumptions accordingly.

## What to leave alone

Existing projects need no action. Do not regenerate a Worker just to "update" it
— the alias change only affects **new** generation.
