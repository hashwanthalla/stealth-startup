FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build:web

FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    gcc \
    g++ \
    openjdk-21-jdk-headless \
    golang-go \
    wget \
    ca-certificates \
  && wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
  && dpkg -i packages-microsoft-prod.deb \
  && apt-get update \
  && apt-get install -y --no-install-recommends dotnet-sdk-8.0 \
  && rm -rf /var/lib/apt/lists/* packages-microsoft-prod.deb

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-electron/server ./dist-electron/server
COPY server/java-tracer ./server/java-tracer
COPY server/native-tracer ./server/native-tracer
COPY server/csharp-tracer ./server/csharp-tracer
COPY server/go-tracer ./server/go-tracer

ENV NODE_ENV=production
ENV PORT=8080
ENV CODEVIZ_DATA_DIR=/data
ENV CODEVIZ_TRACER_ROOT=/app/server
ENV BILLING_ENABLED=false

VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist-electron/server/standalone.js"]
