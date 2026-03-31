import axios from "axios";
import { api } from './index';

const publicConfig = () => ({
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

const authConfig = (token) => ({
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  withCredentials: true,
});

const authFileConfig = (token) => ({
  headers: {
    "Content-Type": "multipart/form-data",
    "Authorization": `Bearer ${token}`,
  },
  withCredentials: true,
});

export const publicGet = async (endpoint) => {
  const response = await axios.get(`${api}${endpoint}`, publicConfig());
  return response.data;
};
export const publicGetSingle = async (endpoint) => {
  const response = await axios.get(`${api}${endpoint}`, publicConfig());
  return response.data;
};
export const publicPost = async (endpoint, body) => {
  const response = await axios.post(`${api}${endpoint}`, body, publicConfig());
  return response.data;
};

export const privateGet = async (endpoint, token) => {
  const response = await axios.get(`${api}${endpoint}`, authConfig(token));
  return response.data;
};

export const privatePost = async (endpoint, token, body) => {
  const response = await axios.post(`${api}${endpoint}`, body, authConfig(token));
  return response.data;
};
export const privatePostFile = async (endpoint, token, body) => {
  const response = await axios.post(`${api}${endpoint}`, body, authFileConfig(token));
  return response.data;
};
export const privatePutFile = async (endpoint, token, body) => {
  const response = await axios.put(`${api}${endpoint}`, body, authFileConfig(token));
  return response.data;
};

export const privatePut = async (endpoint, token, body) => {
  const response = await axios.put(`${api}${endpoint}`, body, authConfig(token));
  return response.data;
};
export const privatePatch = async (endpoint, token, body) => {
  const response = await axios.patch(`${api}${endpoint}`, body, authConfig(token));
  return response.data;
};

export const publicPatch = async (endpoint, body) => {
  const response = await axios.patch(`${api}${endpoint}`, body, publicConfig());
  return response.data;
};

// Default export for direct axios instance with interceptors
const apiInstance = axios.create({
  baseURL: api,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export default apiInstance;
