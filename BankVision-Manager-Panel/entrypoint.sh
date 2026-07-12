#!/bin/sh
cat > /usr/share/nginx/html/config.js <<JSEOF
window.ENV = {
  API_URL: "${VITE_API_URL}",
  WS_URL: "${VITE_WS_URL}",
  ENVIRONMENT: "${VITE_ENVIRONMENT}"
};
JSEOF
exec nginx -g 'daemon off;'
