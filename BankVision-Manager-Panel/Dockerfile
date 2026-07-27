# Manager Panel Dockerfile
# Multi-stage build: Build React app, then serve with nginx

# Build stage
FROM node:20.20.2-alpine3.23 AS builder
WORKDIR /app

# Copy source (incl. package files; node_modules excluded via .dockerignore)
COPY . .

# Install deps AND build in ONE layer. The node_modules/.bin symlinks that npm creates
# (e.g. vite) are used in the same container that created them — some containerd
# snapshotters don't preserve these symlinks across layer commits, which made a separate
# `npm run build` layer fail with "sh: vite: not found".
RUN npm ci --legacy-peer-deps --include=dev && npm run build && npm cache clean --force

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
# location that defines its own add_header, and index/js/css/image locations
# each set their own Cache-Control - without the explicit include, those
# responses would silently ship with no security headers at all.
RUN echo 'add_header X-Frame-Options "SAMEORIGIN" always; \
add_header X-Content-Type-Options "nosniff" always; \
add_header X-XSS-Protection "1; mode=block" always; \
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always; \
add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
add_header Permissions-Policy "camera=(self), microphone=(self), geolocation=()" always; \
add_header Cross-Origin-Resource-Policy "same-origin" always; \
add_header Cross-Origin-Opener-Policy "same-origin" always; \
add_header Cross-Origin-Embedder-Policy "require-corp" always; \
add_header Content-Security-Policy "default-src '"'"'self'"'"'; script-src '"'"'self'"'"' '"'"'wasm-unsafe-eval'"'"'; style-src '"'"'self'"'"' '"'"'unsafe-inline'"'"'; img-src '"'"'self'"'"' data: blob: https:; font-src '"'"'self'"'"' data:; connect-src '"'"'self'"'"' wss: https:; media-src '"'"'self'"'"' blob:; worker-src '"'"'self'"'"' blob:; object-src '"'"'none'"'"'; frame-ancestors '"'"'none'"'"'; base-uri '"'"'self'"'"'; form-action '"'"'self'"'"';" always;' > /etc/nginx/security-headers.conf

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
    location ~* \\.(?:css|js)$ { \
        include /etc/nginx/security-headers.conf; \
        expires 1y; \
        add_header Cache-Control "public, max-age=31536000, must-revalidate"; \
    } \
    \
    # Cache images and fonts aggressively \
    location ~* \\.(?:jpg|jpeg|gif|png|ico|svg|woff|woff2|ttf|eot)$ { \
        include /etc/nginx/security-headers.conf; \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
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
