import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const config = {
  headers: {
    "Content-Type": "application/json",
  },
};

export const publicGet = async (endpoint) => {
  const response = await axios.get(`${API_URL}${endpoint}`, config);
  return response.data;
};

export const publicPost = async (endpoint, body) => {
  const response = await axios.post(`${API_URL}${endpoint}`, body, config);
  return response.data;
};

export const privateGet = async (endpoint, token) => {
  const authConfig = {
    headers: {
      "Content-Type": "application/json",
      token: `${token}`,
    },
  };
  const response = await axios.get(`${API_URL}${endpoint}`, authConfig);
  return response.data;
};

export const privatePost = async (endpoint, token, body) => {
  const authConfig = {
    headers: {
      "Content-Type": "application/json",
      token: `${token}`,
    },
  };
  const response = await axios.post(`${API_URL}${endpoint}`, body, authConfig);
  return response.data;
};

export default {
  publicGet,
  publicPost,
  privateGet,
  privatePost
};
