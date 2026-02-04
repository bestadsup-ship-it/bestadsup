FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/analytics-ingest/package*.json ./services/analytics-ingest/

# Install dependencies
RUN npm install --workspace=packages/shared --workspace=services/analytics-ingest

# Copy source
COPY packages/shared ./packages/shared
COPY services/analytics-ingest ./services/analytics-ingest

# Build
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/analytics-ingest

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/analytics-ingest/package*.json ./services/analytics-ingest/

# Install production dependencies only
RUN npm install --workspace=packages/shared --workspace=services/analytics-ingest --production

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/analytics-ingest/dist ./services/analytics-ingest/dist

# Set environment
ENV NODE_ENV=production

EXPOSE 3003

CMD ["node", "services/analytics-ingest/dist/index.js"]
