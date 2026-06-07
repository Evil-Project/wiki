# Repository Guidelines

## Project Structure & Module Organization

This repository is a single-page wiki built with Vite, React, and TypeScript. Application code lives in `src/`: `main.tsx` mounts React, `App.tsx` contains the page structure, and `styles.css` owns global styling. Static assets belong in `public/`, such as `public/wiki-header.png`; they are copied into `dist/` during builds. Cloudflare Workers Static Assets deployment is configured in `wrangler.jsonc`. Do not edit `dist/` directly; regenerate it with the build command.

## Build, Test, and Development Commands

- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` starts the Vite dev server for local work.
- `npm run build` runs TypeScript project checks and builds static assets into `dist/`.
- `npm run preview` serves the production build locally.
- `npm run deploy` builds and deploys through Wrangler.
- `npx wrangler deploy --dry-run` validates the Workers asset configuration without publishing.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Prefer React function components, `const` data arrays, and clear prop-free section components until reuse is needed. Use PascalCase for components and files that export components, camelCase for variables, and kebab-case for CSS class names. Keep indentation at two spaces in JSON, TSX, and CSS. Favor semantic HTML, accessible labels, and lucide-react icons for UI symbols.

## Testing Guidelines

No automated test runner is configured yet. For now, treat `npm run build` as the required verification gate. For visual changes, check both desktop and mobile widths locally. If behavior grows beyond static content, add Vitest and React Testing Library, place tests near the source as `*.test.tsx`, and cover navigation, rendering, and data transformations.

## Commit & Pull Request Guidelines

The current history only contains `Initial commit`, so there is no strong local convention yet. Use Conventional Commits going forward, for example `feat: add wiki search` or `fix: constrain mobile hero text`. Pull requests should include a short description, verification commands run, linked issue when available, and screenshots for visible UI changes.

## Security & Configuration Tips

Do not commit `.env` files or Cloudflare credentials. Keep deployment settings in `wrangler.jsonc`, and prefer dry-run deploys before publishing configuration changes.
