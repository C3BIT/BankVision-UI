import axios from "axios";
import { api } from './index';

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
  const response = await axios.get(`${api}${endpoint}`, { headers: baseHeaders });
  return response.data;
};
export const publicGetSingle = async (endpoint) => {
  const response = await axios.get(`${api}${endpoint}`, { headers: baseHeaders });
  return response.data;
};
export const publicPost = async (endpoint, body) => {
  const response = await axios.post(`${api}${endpoint}`, body, { headers: baseHeaders });
  return response.data;
};

export const privateGet = async (endpoint, token) => {
  const response = await axios.get(`${api}${endpoint}`, { headers: authHeaders(token) });
  return response.data;
};

export const privatePost = async (endpoint, token, body) => {
  const response = await axios.post(`${api}${endpoint}`, body, { headers: authHeaders(token) });
  return response.data;
};
export const privatePostFile = async (endpoint, token, body) => {
  const response = await axios.post(`${api}${endpoint}`, body, { headers: authFileHeaders(token) });
  return response.data;
};

export const publicPostFile = async (endpoint, body) => {
  const response = await axios.post(`${api}${endpoint}`, body, { headers: { "Content-Type": "multipart/form-data" } });
  return response.data;
};
export const privatePutFile = async (endpoint, token, body) => {
  const response = await axios.put(`${api}${endpoint}`, body, { headers: authFileHeaders(token) });
  return response.data;
};

export const privatePut = async (endpoint, token, body) => {
  const response = await axios.put(`${api}${endpoint}`, body, { headers: authHeaders(token) });
  return response.data;
};
export const privatePatch = async (endpoint, token, body) => {
  const response = await axios.patch(`${api}${endpoint}`, body, { headers: authHeaders(token) });
  return response.data;
};

export const publicPatch = async (endpoint, body) => {
  const response = await axios.patch(`${api}${endpoint}`, body, { headers: baseHeaders });
  return response.data;
};