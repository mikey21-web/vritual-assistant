# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
# jsvoice's published npm package omits its own workers/ dir from its "files"
# allowlist, so a clean `npm ci` can't resolve jsvoice/workers/local-asr.worker.js
# even though the identical file ships under src/workers/. Copy it into place so
# Vite's worker plugin (which resolves this via new URL(), not module resolution)
# can find it. Remove once jsvoice fixes its packaging upstream.
RUN mkdir -p /app/node_modules/jsvoice/workers && \
    cp /app/node_modules/jsvoice/src/workers/local-asr.worker.js /app/node_modules/jsvoice/workers/local-asr.worker.js && \
    node -e "const fs=require('fs');const p='/app/node_modules/jsvoice/src/modules/RecognitionManager.js';let c=fs.readFileSync(p,'utf8');c=c.replace('handleSpeechResult(transcript);','handleSpeechResult(transcript);callCallback(\"onResult\",transcript,true);');fs.writeFileSync(p,c);"
COPY . .
# Vite inlines VITE_* at build time, so the API URL must be set BEFORE `npm run build`.
# Same-origin default: the frontend calls /api/* which the reverse proxy routes to the backend.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_NICHE_NAME=agency
ENV VITE_NICHE_NAME=$VITE_NICHE_NAME
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
