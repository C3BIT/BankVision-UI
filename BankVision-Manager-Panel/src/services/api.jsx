import axios from 'axios';
import { api as baseURL } from './index';

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Try to get token from redux-persist localStorage
    let token = null;

    try {
      const persistedState = localStorage.getItem('persist:authentication');
      if (persistedState) {
        const authState = JSON.parse(persistedState);
        // Redux-persist stores values as JSON strings, so parse again
        token = authState.token ? JSON.parse(authState.token) : null;
      }
    } catch (e) {
      console.error('Error reading token from persisted state:', e);
    }

    // Fallback to direct localStorage token
    if (!token) {
      token = localStorage.getItem('token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Clear redirect flag if user has valid token
      sessionStorage.removeItem('auth_redirecting');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Clear redirect flag on successful response
    sessionStorage.removeItem('auth_redirecting');
    return response;
  },
  (error) => {
    // Only redirect to login if we get 401 and we're not already on login page
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Prevent redirect loops - only redirect once
      const isRedirecting = sessionStorage.getItem('auth_redirecting');
      if (!isRedirecting) {
        sessionStorage.setItem('auth_redirecting', 'true');
        // Clear all auth-related data
        localStorage.removeItem('token');
        localStorage.removeItem('persist:authentication');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
