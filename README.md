# Wiki

A single-page wiki built with Vite, React, and TypeScript, deployable to Cloudflare Workers as Static Assets.

## Scripts

- `npm run dev` starts local Vite development.
- `npm run build` type-checks and builds to `dist`.
- `npm run preview` serves the production build locally.
- `npm run deploy` builds and deploys with Wrangler.

## Deploy

Authenticate Wrangler first if needed:

```sh
npx wrangler login
```

Then deploy:

```sh
npm run deploy
```

Wrangler reads `wrangler.jsonc`, uploads `dist`, and serves the built wiki from Cloudflare Workers Static Assets.
