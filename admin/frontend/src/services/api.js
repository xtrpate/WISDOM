// src/services/api.js – Axios instance with JWT interceptor + detailed error handling
import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wisdom_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// Handle responses + errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message;

    // 401 – session expired or invalid token
    if (status === 401) {
      localStorage.removeItem('wisdom_token');
      localStorage.removeItem('wisdom_user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 403 – access denied
    if (status === 403) {
      toast.error('Access denied. You do not have permission for this action.');
      return Promise.reject(error);
    }

    // 404 – not found (don't show toast for these — components handle them)
    if (status === 404) {
      return Promise.reject(error);
    }

    // 422 – validation errors
    if (status === 422) {
      const errors = error.response?.data?.errors;
      if (errors?.length) {
        toast.error(errors.map(e => e.msg).join(' · '));
      } else {
        toast.error(message || 'Validation error.');
      }
      return Promise.reject(error);
    }

    // 500 – server error
    if (status === 500) {
      toast.error(message || 'Server error. Check the backend console for details.');
      return Promise.reject(error);
    }

    // Network error (backend not running)
    if (!error.response) {
      toast.error(
        'Cannot connect to server. Make sure the backend is running on port 5000.',
        { id: 'network-error', duration: 6000 }
      );
      return Promise.reject(error);
    }

    // Other errors
    if (message) toast.error(message);
    return Promise.reject(error);
  }
);

export default api;
