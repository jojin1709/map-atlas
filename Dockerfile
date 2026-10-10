# Multi-stage build for Map Atlas
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build Go Tile Proxy Cache
FROM golang:1.22-alpine AS go-builder
WORKDIR /server
COPY server/ ./
RUN if [ -f main.go ]; then go build -o tile-proxy main.go; elif [ -f cache.go ]; then go build -o tile-proxy cache.go; fi

# Stage 3: Production Caddy / Nginx Static Web Server
FROM nginx:alpine AS runner
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
