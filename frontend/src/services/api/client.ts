import axios from 'axios';

// Vite 프록시를 사용하므로 상대 경로 사용
// 환경 변수가 설정되어 있으면 그 값을 사용하고, 없으면 프록시를 통해 /api 사용
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      localStorage.removeItem('access_token');
      // 현재 경로가 /auth가 아닐 때만 리다이렉트
      // React Query가 에러를 처리할 수 있도록 약간의 지연 추가
      if (window.location.pathname !== '/auth') {
        // React Query의 에러 처리를 위해 약간의 지연
        // 이렇게 하면 React Query가 먼저 에러를 처리할 수 있음
        setTimeout(() => {
          window.location.href = '/auth';
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

