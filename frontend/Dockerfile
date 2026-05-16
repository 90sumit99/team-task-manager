FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build Vite app
RUN npm run build

# Install serve to serve the dist folder
RUN npm install -g serve

EXPOSE 3000

CMD ["sh", "-c", "serve dist -p ${PORT:-3000}"]
