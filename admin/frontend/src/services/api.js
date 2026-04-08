// src/services/api.js – Axios instance with JWT interceptor + detailed error handling
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE_URL = "https://wisdom-ov31.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("wisdom_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401) {
      localStorage.removeItem("wisdom_token");
      localStorage.removeItem("wisdom_user");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (status === 403) {
      toast.error("Access denied. You do not have permission for this action.");
      return Promise.reject(error);
    }

    if (status === 404) {
      return Promise.reject(error);
    }

    if (status === 422) {
      const errors = error.response?.data?.errors;
      if (errors?.length) {
        toast.error(errors.map((e) => e.msg).join(" · "));
      } else {
        toast.error(message || "Validation error.");
      }
      return Promise.reject(error);
    }

    if (status === 500) {
      toast.error(
        message || "Server error. Check the backend console for details.",
      );
      return Promise.reject(error);
    }

    if (!error.response) {
      toast.error(
        "Cannot connect to server. Make sure the backend is running on port 5001.",
        { id: "network-error", duration: 6000 },
      );
      return Promise.reject(error);
    }

    if (message) {
      toast.error(message);
    }

    return Promise.reject(error);
  },
);

export default api;
