# ==================== FRONTEND DOCKERFILE ====================
# Multi-stage build for React application with Nginx

# Stage 1: Build the React application
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
# This allows Docker to cache the npm install step if package.json doesn't change
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the React application for production
RUN npm run build

# Stage 2: Production server with Nginx
FROM nginx:alpine

# Copy the built React application to Nginx's default directory
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration for reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for HTTP traffic
EXPOSE 80

# Start Nginx server in foreground mode
CMD ["nginx", "-g", "daemon off;"]
