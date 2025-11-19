import apiClient from './client';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../../types';

export const authApi = {
  /**
   * 회원가입
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * 로그인
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * 현재 사용자 조회
   */
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * 로그아웃
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};

