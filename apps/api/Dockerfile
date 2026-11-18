# Build from the repo root: docker build -f apps/api/Dockerfile .
# npm workspaces share one lockfile, so every workspace manifest is copied before installing.

FROM node:24-alpine AS manifests
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/engine/package.json apps/engine/
COPY packages/contracts/package.json packages/contracts/
COPY packages/db-types/package.json packages/db-types/

FROM manifests AS build
RUN npm ci --workspace @arandu/api
COPY packages packages
COPY apps/api apps/api
RUN npm run build --workspace @arandu/api

FROM manifests AS runtime-deps
RUN npm ci --workspace @arandu/api --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
# Render's free instance has 512 MB: a heap cap below it makes V8 collect garbage before the host kills the process.
ENV NODE_OPTIONS=--max-old-space-size=384
WORKDIR /repo
COPY --from=runtime-deps /repo/node_modules node_modules
COPY --from=build /repo/apps/api/package.json apps/api/
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
