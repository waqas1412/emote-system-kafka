# ==================== EMOTE GENERATOR DOCKERFILE ====================
# Service for generating simulated emote data

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

# Start the emote generator service
CMD ["node", "index.js"]
