# ── build stage ──────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── runtime stage ───────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve@14
COPY --from=build /app/dist ./dist

# Railway sets $PORT dynamically; serve must bind to it
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
