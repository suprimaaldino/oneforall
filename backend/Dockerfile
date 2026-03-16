FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production=false
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production && npm cache clean --force
COPY --from=builder /app/dist ./dist

# Create data & auth directories
RUN mkdir -p /app/data /app/auth_info

EXPOSE 3000
CMD ["node", "dist/index.js"]
