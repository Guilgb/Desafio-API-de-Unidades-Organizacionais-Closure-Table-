FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

FROM base AS deps

COPY package*.json ./

RUN npm ci

FROM base AS development

COPY --from=deps /app/node_modules ./node_modules

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache libc6-compat

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/main"]
