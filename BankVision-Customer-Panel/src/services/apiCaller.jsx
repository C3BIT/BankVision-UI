import axios from "axios";
import { api } from './index';

// Shared axios instance used for all REST API traffic in this panel.
//
// A transparent Base64 encode/decode layer sits on top of TLS purely to keep
// raw JSON out of request/response bodies on the wire. TLS already provides
// real confidentiality; this codec layer is an additional, explicitly
// requested obfuscation step that must match the backend's contract exactly:
//   - Outgoing JSON bodies are JSON.stringify'd, UTF-8 safe Base64 encoded,
//     and sent as a raw string body with Content-Type: application/base64.
//   - Incoming Base64 string bodies (Content-Type: application/base64) are
//     decoded and JSON.parse'd back into response.data / error.response.data
//     so every other call site can keep reading response.data.xxx unmodified.
export const apiClient = axios.create();

// UTF-8 safe Base64 encode (handles non-ASCII characters, e.g. Bengali text)
const encodeBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

// UTF-8 safe Base64 decode (inverse of encodeBase64)
const decodeBase64 = (str) => decodeURIComponent(escape(atob(str)));

apiClient.interceptors.request.use(
  (config) => {
    // Never touch FormData (file uploads / multipart) or requests with no body
    if (config.data === undefined || config.data === null || config.data instanceof FormData) {
      return config;
    }

    const jsonString = JSON.stringify(config.data);
    config.data = encodeBase64(jsonString);
    config.headers = config.headers || {};
    config.headers["Content-Type"] = "application/base64";

    return config;
  },
  (error) => Promise.reject(error)
);

const decodeResponseData = (response) => {
  if (response && typeof response.data === "string") {
    const contentType = response.headers?.["content-type"] || response.headers?.["Content-Type"];
    if (contentType && contentType.includes("application/base64")) {
      try {
        const decoded = decodeBase64(response.data);
        response.data = JSON.parse(decoded);
      } catch (err) {
        console.error("Failed to decode Base64 response payload:", err);
      }
    }
  }
  return response;
};

apiClient.interceptors.response.use(
  (response) => decodeResponseData(response),
  (error) => {
    if (error.response) {
      decodeResponseData(error.response);
    }
    return Promise.reject(error);
  }
);

const baseHeaders = {
  "Content-Type": "application/json",
};

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`,
});

const authFileHeaders = (token) => ({
  "Content-Type": "multipart/form-data",
  "Authorization": `Bearer ${token}`,
});

export const publicGet = async (endpoint) => {
  const response = await apiClient.get(`${api}${endpoint}`, { headers: baseHeaders });
  return response.data;
};
export const publicGetSingle = async (endpoint) => {
  const response = await apiClient.get(`${api}${endpoint}`, { headers: baseHeaders });
  return response.data;
};
export const publicPost = async (endpoint, body) => {
  const response = await apiClient.post(`${api}${endpoint}`, body, { headers: baseHeaders });
  return response.data;
};

export const privateGet = async (endpoint, token) => {
  const response = await apiClient.get(`${api}${endpoint}`, { headers: authHeaders(token) });
  return response.data;
};

export const privatePost = async (endpoint, token, body) => {
  const response = await apiClient.post(`${api}${endpoint}`, body, { headers: authHeaders(token) });
  return response.data;
};
export const privatePostFile = async (endpoint, token, body) => {
  const response = await apiClient.post(`${api}${endpoint}`, body, { headers: authFileHeaders(token) });
  return response.data;
};

export const publicPostFile = async (endpoint, body) => {
  const response = await apiClient.post(`${api}${endpoint}`, body, { headers: { "Content-Type": "multipart/form-data" } });
  return response.data;
};
export const privatePutFile = async (endpoint, token, body) => {
  const response = await apiClient.put(`${api}${endpoint}`, body, { headers: authFileHeaders(token) });
  return response.data;
};

export const privatePut = async (endpoint, token, body) => {
  const response = await apiClient.put(`${api}${endpoint}`, body, { headers: authHeaders(token) });
  return response.data;
};
export const privatePatch = async (endpoint, token, body) => {
  const response = await apiClient.patch(`${api}${endpoint}`, body, { headers: authHeaders(token) });
  return response.data;
};

export const publicPatch = async (endpoint, body) => {
  const response = await apiClient.patch(`${api}${endpoint}`, body, { headers: baseHeaders });
  return response.data;
};
