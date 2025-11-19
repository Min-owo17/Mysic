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
    const fullUrl = `${config.baseURL}${config.url}`;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Request:', {
        relativeUrl: config.url,
        baseURL: config.baseURL,
        fullUrl: fullUrl,
        method: config.method,
        hasToken: true,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...', // 토큰 일부만 표시
        headers: {
          ...config.headers,
          Authorization: 'Bearer ***', // 토큰 전체는 숨김
        },
      });
    } else {
      console.warn('API Request (No Token):', {
        relativeUrl: config.url,
        baseURL: config.baseURL,
        fullUrl: fullUrl,
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
    const relativeUrl = error.config?.url || 'unknown';
    const baseURL = error.config?.baseURL || '';
    const fullUrl = `${baseURL}${relativeUrl}`;
    
    console.error('API Error:', {
      relativeUrl: relativeUrl,
      baseURL: baseURL,
      fullUrl: fullUrl,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      requestHeaders: error.config?.headers,
      responseHeaders: error.response?.headers,
    });

    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      console.error('=== 401 Unauthorized 에러 상세 정보 ===');
      console.error('실제 요청 URL:', fullUrl);
      console.error('상대 경로:', relativeUrl);
      console.error('Base URL:', baseURL);
      console.error('요청 메서드:', error.config?.method);
      console.error('Authorization 헤더 존재:', !!error.config?.headers?.Authorization);
      console.error('Authorization 헤더 값:', error.config?.headers?.Authorization ? 'Bearer ***' : '없음');
      console.error('응답 데이터:', error.response?.data);
      console.error('현재 localStorage 토큰 존재:', !!localStorage.getItem('access_token'));
      console.error('=====================================');
      
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

