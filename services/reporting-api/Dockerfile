FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/reporting-api/package*.json ./services/reporting-api/

# Install dependencies
RUN npm ci --workspace=packages/shared --workspace=services/reporting-api

# Copy source
COPY packages/shared ./packages/shared
COPY services/reporting-api ./services/reporting-api

# Build
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/reporting-api

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/reporting-api/package*.json ./services/reporting-api/

# Install production dependencies only
RUN npm ci --workspace=packages/shared --workspace=services/reporting-api --production

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/reporting-api/dist ./services/reporting-api/dist

# Set environment
ENV NODE_ENV=production

EXPOSE 3004

CMD ["node", "services/reporting-api/dist/index.js"]
