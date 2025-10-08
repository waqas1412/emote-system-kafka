# ==================== SERVER A DOCKERFILE ====================
# WebSocket service for real-time client communication

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

# Expose port 3002 for WebSocket connections
EXPOSE 3002

# Start the WebSocket server
CMD ["node", "index.js"]
