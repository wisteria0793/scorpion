// src/services/apiClient.js
import axios from 'axios';

// Decide API base URL per environment: use env if set, localhost in dev, same-origin proxy in prod.
const envBase = import.meta.env.VITE_API_BASE_URL;
const computedBase = (() => {
  if (envBase) return envBase;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    return isLocal ? 'http://localhost:8000/api' : `${window.location.origin}/api`;
  }
  return 'http://localhost:8000/api';
})();

export const apiBaseURL = computedBase;

const apiClient = axios.create({
  baseURL: computedBase,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export default apiClient;
