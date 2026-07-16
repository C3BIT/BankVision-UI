// NOTE: Routes through the shared `api` axios instance (src/services/api.jsx) so every
// call here inherits the Bearer-token request interceptor and the transparent
// Base64 encode/decode layer for free. Do not call the bare `axios` module here.
import api from './api.jsx';

// Auth token is already injected by api.jsx's request interceptor from redux-persist
// localStorage, but these helpers accept an explicit `token` for backward compatibility
// with existing call sites; when provided it overrides the interceptor's header.
const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const fileHeaders = (token) => ({
  'Content-Type': 'multipart/form-data',
  ...authHeaders(token),
});

export const publicGet = async (endpoint) => {
  const response = await api.get(endpoint, { withCredentials: true });
  return response.data;
};
export const publicGetSingle = async (endpoint) => {
  const response = await api.get(endpoint, { withCredentials: true });
  return response.data;
};
export const publicPost = async (endpoint, body) => {
  const response = await api.post(endpoint, body, { withCredentials: true });
  return response.data;
};

export const privateGet = async (endpoint, token) => {
  const response = await api.get(endpoint, { headers: authHeaders(token), withCredentials: true });
  return response.data;
};

export const privatePost = async (endpoint, token, body) => {
  const response = await api.post(endpoint, body, { headers: authHeaders(token), withCredentials: true });
  return response.data;
};
export const privatePostFile = async (endpoint, token, body) => {
  const response = await api.post(endpoint, body, { headers: fileHeaders(token), withCredentials: true });
  return response.data;
};
export const privatePutFile = async (endpoint, token, body) => {
  const response = await api.put(endpoint, body, { headers: fileHeaders(token), withCredentials: true });
  return response.data;
};

export const privatePut = async (endpoint, token, body) => {
  const response = await api.put(endpoint, body, { headers: authHeaders(token), withCredentials: true });
  return response.data;
};
export const privatePatch = async (endpoint, token, body) => {
  const response = await api.patch(endpoint, body, { headers: authHeaders(token), withCredentials: true });
  return response.data;
};

export const publicPatch = async (endpoint, body) => {
  const response = await api.patch(endpoint, body, { withCredentials: true });
  return response.data;
};

export default api;
