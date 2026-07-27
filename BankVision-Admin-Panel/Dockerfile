# Admin Panel V2 Dockerfile
# Multi-stage build: Build React app, then serve with nginx

# Build stage
FROM node:20.20.2-alpine3.23 AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm ci for cleaner install if lockfile exists, otherwise npm install)
RUN npm install --include=dev

# Copy source code
COPY . .

# Build for production
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Production stage with nginx
FROM nginx:1.29.7-alpine
WORKDIR /usr/share/nginx/html

# Install wget for healthcheck
RUN apk add --no-cache wget

# Remove default nginx static files
RUN rm -rf ./*

# Copy built assets from builder
COPY --from=builder /app/dist .

# Security headers live in their own snippet and are explicitly included in
# every location block below. nginx's add_header does NOT inherit into a
# location that defines its own add_header, and index/js/css locations each
# set their own Cache-Control - without the explicit include, those
# responses would silently ship with no security headers at all.
RUN echo 'add_header X-Frame-Options "SAMEORIGIN" always; \
add_header X-Content-Type-Options "nosniff" always; \
add_header X-XSS-Protection "1; mode=block" always; \
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always; \
add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
add_header Permissions-Policy "camera=(self), microphone=(self), geolocation=()" always; \
add_header Cross-Origin-Resource-Policy "same-origin" always; \
add_header Content-Security-Policy "default-src '"'"'self'"'"'; script-src '"'"'self'"'"'; style-src '"'"'self'"'"' '"'"'unsafe-inline'"'"' https://fonts.googleapis.com; img-src '"'"'self'"'"' data: blob: https:; font-src '"'"'self'"'"' data: https://fonts.gstatic.com; connect-src '"'"'self'"'"' wss: https:; media-src '"'"'self'"'"' blob:; object-src '"'"'none'"'"'; frame-ancestors '"'"'none'"'"'; base-uri '"'"'self'"'"'; form-action '"'"'self'"'"';" always;' > /etc/nginx/security-headers.conf

# Create nginx configuration for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    server_tokens off; \
    \
    include /etc/nginx/security-headers.conf; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss; \
    \
    # Never cache index.html - always check for updates \
    location = /index.html { \
        include /etc/nginx/security-headers.conf; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        add_header Pragma "no-cache"; \
        add_header Expires "0"; \
        try_files $uri =404; \
    } \
    \
    # Cache JS/CSS with revalidation (Vite uses hash-based filenames) \
    location ~* \.(?:css|js)$ { \
        include /etc/nginx/security-headers.conf; \
        expires 1y; \
        add_header Cache-Control "public, max-age=31536000, must-revalidate"; \
    } \
    \
    # SPA routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && mkdir -p /var/cache/nginx/client_temp \
                /var/cache/nginx/proxy_temp \
                /var/cache/nginx/fastcgi_temp \
                /var/cache/nginx/uwsgi_temp \
                /var/cache/nginx/scgi_temp \
    && chown -R nginx:nginx \
                /usr/share/nginx/html \
                /var/cache/nginx \
                /var/log/nginx \
                /etc/nginx/conf.d \
    && chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["/entrypoint.sh"]
