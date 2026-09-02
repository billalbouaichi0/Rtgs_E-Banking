import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// Intercepteur pour injecter le token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bdl_rtgs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercepteur pour gérer l'expiration du token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Rediriger vers le login si token expiré
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('bdl_rtgs_token');
        localStorage.removeItem('bdl_rtgs_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
