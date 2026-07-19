import axios from 'axios';
import { API_URL } from '../config.js';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // For httpOnly cookies
});

// Auth is carried solely by the httpOnly auth_token cookie (see withCredentials
// above) - no bearer token is attached here, so the JWT is never readable by JS.
api.interceptors.request.use(
    (config) => {
        // Transparent Base64 encoding layer on top of TLS.
        // Skip FormData (file uploads / multipart) and requests with no body.
        if (config.data !== undefined && config.data !== null && !(config.data instanceof FormData)) {
            const jsonString = JSON.stringify(config.data);
            const base64Body = btoa(unescape(encodeURIComponent(jsonString)));
            config.data = base64Body;
            config.headers['Content-Type'] = 'application/base64';
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Decode a Base64-encoded JSON response body back into an object.
const decodeBase64Response = (response) => {
    if (
        response &&
        typeof response.data === 'string' &&
        response.headers?.['content-type']?.includes('application/base64')
    ) {
        try {
            const jsonString = decodeURIComponent(escape(atob(response.data)));
            response.data = JSON.parse(jsonString);
        } catch {
            // If decoding fails, leave response.data as-is.
        }
    }
    return response;
};

// Handle response errors
api.interceptors.response.use(
    (response) => decodeBase64Response(response),
    (error) => {
        if (error.response) {
            decodeBase64Response(error.response);
        }

        if (error.response?.status === 401) {
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
