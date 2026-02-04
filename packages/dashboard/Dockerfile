# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/dashboard/package*.json ./packages/dashboard/

# Install dependencies
RUN npm install --workspace=packages/dashboard

# Copy source code
COPY packages/dashboard ./packages/dashboard

# Build arguments for environment variables
ARG REACT_APP_CONTROL_PLANE_URL
ARG REACT_APP_REPORTING_URL

ENV REACT_APP_CONTROL_PLANE_URL=${REACT_APP_CONTROL_PLANE_URL}
ENV REACT_APP_REPORTING_URL=${REACT_APP_REPORTING_URL}

# Build the application
WORKDIR /app/packages/dashboard
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY packages/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/packages/dashboard/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
