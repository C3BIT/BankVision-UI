// Runtime config — reads window.ENV injected by entrypoint.sh at container start.
// Falls back to import.meta.env for local development.
export const API_URL = window.ENV?.API_URL || import.meta.env.VITE_API_URL || 'https://vb-api.feedquix.com/api';
export const WS_URL  = window.ENV?.WS_URL  || import.meta.env.VITE_WS_URL  || 'https://vb-api.feedquix.com';
