FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

FROM base AS deps

COPY package*.json ./
COPY app/challange-service/package*.json ./app/challange-service/

RUN npm ci --workspace=challange-service

FROM base AS development

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/app/challange-service/node_modules ./app/challange-service/node_modules

COPY . .

WORKDIR /app/app/challange-service
EXPOSE 3002

CMD ["npm", "run", "dev"]

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/app/challange-service/node_modules ./app/challange-service/node_modules

COPY . .

WORKDIR /app/app/challange-service
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache libc6-compat

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/app/challange-service/dist ./dist
COPY --from=builder /app/app/challange-service/package*.json ./
COPY --from=builder /app/app/challange-service/node_modules ./node_modules

USER nestjs

EXPOSE 3002

ENV NODE_ENV=production

CMD ["node", "dist/src/main"]
