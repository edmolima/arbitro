# Installing `@edmolima/arbitro` in another project

`@edmolima/arbitro` is published to **GitHub Packages**, not the public npm
registry. GitHub Packages always requires authentication — even for public
packages — so installing it takes a one-time setup. This guide walks through it
end to end.

## 1. Create a GitHub token

You need a token with the **`read:packages`** scope.

- Go to **GitHub → Settings → Developer settings → Personal access tokens**.
- **Classic token:** create one and check `read:packages`.
- **Fine-grained token:** give it read access to the repository's packages.

Copy the token (starts with `ghp_...`). Treat it like a password — never commit it.

## 2. Point the `@edmolima` scope at GitHub Packages

Create or edit `.npmrc` in your project root (recommended) or `~/.npmrc`:

```
@edmolima:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

The first line routes only the `@edmolima` scope to GitHub Packages; everything
else still resolves from the public npm registry. The second line reads the token
from an environment variable, so the secret never lives in the file.

Then export the token in your shell:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

> Prefer not to use an env var? You can paste the token directly after
> `_authToken=` instead — but then keep `.npmrc` out of version control
> (add it to `.gitignore`).

## 3. Install

```bash
npm i @edmolima/arbitro
# or: pnpm add @edmolima/arbitro
# or: yarn add @edmolima/arbitro
```

## 4. Use it

```ts
import { judge, createArbitro } from "@edmolima/arbitro";

const decision = judge("write a merge sort function in rust with tests");
console.log(decision.model); // → the OpenRouter slug to call
```

See the [root README](../README.md) for the full API and an OpenRouter call
example.

## CI / CD (installing in a pipeline)

In GitHub Actions the built-in `GITHUB_TOKEN` can read packages from repositories
in the same account. Configure the registry via `setup-node`:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    registry-url: https://npm.pkg.github.com
    scope: "@edmolima"
- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

For other CI systems, set the same two `.npmrc` lines and provide a
`read:packages` token as `GITHUB_TOKEN`.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `401 Unauthorized` | Token missing, expired, or lacks `read:packages`. Re-check step 1 and that `GITHUB_TOKEN` is exported in the same shell. |
| `404 Not Found` for `@edmolima/arbitro` | The `@edmolima:registry` line is missing from `.npmrc`, so npm looked on the public registry. Re-check step 2. |
| `E401` only in CI | The env var isn't wired — pass `NODE_AUTH_TOKEN` (Actions) or the equivalent secret. |
| Works locally, fails for a teammate | `.npmrc` uses a hardcoded token that isn't shared, or their `GITHUB_TOKEN` isn't set. Prefer the env-var form. |
