import axios from 'axios';

// Override via VITE_API_URL (see .env.example). Defaults to the hosted backend
// for production; local dev points it at localhost:5001 via .env.
export const API_URL = import.meta.env.VITE_API_URL || 'https://goodwillprinters.onrender.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the session and bounce to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Pull a human-readable message out of an axios error
export const apiError = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.error || err?.message || fallback;

export default api;
