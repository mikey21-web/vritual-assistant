# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts
RUN node -e "console.log('OpenSSL:', process.versions.openssl)"
RUN npx prisma --version
RUN npx prisma generate --schema=prisma/schema.prisma
COPY . .
RUN npm run build 2>&1
RUN find /app/dist -type f -name "*.js" | head -20 && echo "---" && ls -la /app/dist/

FROM node:20-bookworm-slim AS production
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends curl openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD node dist/main
