# ==================== SERVER B DOCKERFILE ====================
# Data processing service with REST API for configuration

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
# This allows Docker to cache the npm install step if package.json doesn't change
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port 3001 for REST API
EXPOSE 3001

# Start the data processing server
CMD ["node", "index.js"]
