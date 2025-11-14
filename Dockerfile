# Minimal image with Node 18
FROM node:18-slim

# Set working dir
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --production

# Copy app
COPY index.js ./

# Cloud Run expects the service to listen on $PORT
ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
