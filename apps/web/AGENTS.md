<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This app

- The browser never calls the API, except the landing's public books (GET). Everything else goes through this app's
  server, which holds the session cookie and sends `x-internal-secret` (ADR-0005).
- Branch on `error.code` from API errors, never on the status alone or the message (ADR-0006).
- No raw design values (hex, px, inline styles): every value comes from the tokens; `arandu/no-raw-design-values`
  enforces it.
- In the 3D loops (`src/ui/cat-scene.ts`, `src/ui/shelf-scene.ts`, `src/landing/stage/*`): no allocations per frame,
  and index guards stay free (`!` on an index the loop bounds, `?.` or `?? 0` where it can miss).
