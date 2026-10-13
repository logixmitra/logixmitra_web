import axios from "axios";
import { API_BASE_URL } from "../../services/config";

const API = axios.create({
  baseURL: `${API_BASE_URL}/`,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && token !== "undefined" && token !== "null") {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const apiRequest = (method: string, url: string, data = {}, params = {}) => {
  return API({
    method,
    url,
    data,
    params,
  });
};

export default API;
