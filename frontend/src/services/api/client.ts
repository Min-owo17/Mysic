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
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        hasToken: true,
        tokenLength: token.length,
      });
    } else {
      console.warn('API Request (No Token):', {
        url: config.url,
        method: config.method,
        hasToken: false,
      });
    }
    return config;
  },
  (error) => {
    console.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 모든 에러를 콘솔에 상세히 로깅 (디버깅용)
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      fullError: error,
    });

    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      console.warn('401 Unauthorized - 인증 토큰이 유효하지 않습니다.');
      console.warn('요청 URL:', error.config?.url);
      console.warn('요청 메서드:', error.config?.method);
      console.warn('응답 데이터:', error.response?.data);
      
      localStorage.removeItem('access_token');
      
      // 현재 경로가 /auth가 아닐 때만 리다이렉트
      if (window.location.pathname !== '/auth') {
        // 개발 모드에서는 더 긴 지연을 두어 Network 탭 확인 가능
        // 프로덕션에서는 짧은 지연 사용
        const isDevelopment = import.meta.env.DEV;
        const redirectDelay = isDevelopment ? 5000 : 1000; // 개발 모드: 5초, 프로덕션: 1초
        
        console.warn(`${redirectDelay / 1000}초 후 로그인 페이지로 리다이렉트됩니다.`);
        console.warn('Network 탭에서 요청 상세 정보를 확인하세요.');
        
        setTimeout(() => {
          console.warn('리다이렉트 실행');
          window.location.href = '/auth';
        }, redirectDelay);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

