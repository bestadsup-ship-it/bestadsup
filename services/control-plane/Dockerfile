FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/control-plane/package*.json ./services/control-plane/
RUN npm install --workspace=packages/shared --workspace=services/control-plane
COPY packages/shared ./packages/shared
COPY services/control-plane ./services/control-plane
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/control-plane

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/control-plane/package*.json ./services/control-plane/
RUN npm install --workspace=packages/shared --workspace=services/control-plane --production
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/control-plane/dist ./services/control-plane/dist
ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "services/control-plane/dist/index.js"]
