import axios from 'axios';
import { api as baseURL } from './index';

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
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
  (error) => {
    return Promise.reject(error);
  }
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
    } catch (e) {
      console.error('Error decoding Base64 response:', e);
      // If decoding fails, leave response.data as-is.
    }
  }
  return response;
};

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Clear redirect flag on successful response
    sessionStorage.removeItem('auth_redirecting');
    return decodeBase64Response(response);
  },
  (error) => {
    if (error.response) {
      decodeBase64Response(error.response);
    }

    // Only redirect to login if we get 401 and we're not already on login page
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Prevent redirect loops - only redirect once
      const isRedirecting = sessionStorage.getItem('auth_redirecting');
      if (!isRedirecting) {
        sessionStorage.setItem('auth_redirecting', 'true');
        // Clear persisted auth data
        localStorage.removeItem('persist:authentication');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
