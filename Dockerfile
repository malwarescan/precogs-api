# Dockerfile for Croutons API and md-server
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all source code
COPY . .

# Expose port
EXPOSE 8080

# Default start command (can be overridden)
CMD ["npm", "start"]
