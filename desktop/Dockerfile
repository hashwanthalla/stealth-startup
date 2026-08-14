FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=512

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build:web

FROM node:22-bookworm-slim

# Compilers for visualization (C# omitted on web beta to keep image small)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    gcc \
    g++ \
    default-jdk-headless \
    golang-go \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-electron/server ./dist-electron/server
COPY --from=builder /app/dist-electron/shared ./dist-electron/shared
COPY server/java-tracer ./server/java-tracer
COPY server/native-tracer ./server/native-tracer
COPY server/csharp-tracer ./server/csharp-tracer
COPY server/go-tracer ./server/go-tracer

ENV NODE_ENV=production
ENV PORT=10000
ENV CODEVIZ_DATA_DIR=/app/data
ENV CODEVIZ_TRACER_ROOT=/app/server
ENV BILLING_ENABLED=false

EXPOSE 10000

CMD ["node", "dist-electron/server/standalone.js"]
