# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
# Install deps first so this layer is cached unless package files change
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
# Generate Prisma client next; cached unless the schema changes
COPY prisma ./prisma
RUN npx prisma generate --schema=prisma/schema.prisma
# Source last, so code changes don't bust the install/generate layers
COPY . ./
RUN npm run build

FROM node:20-bookworm-slim AS production
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends curl openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD node dist/main
