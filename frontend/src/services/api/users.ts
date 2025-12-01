import apiClient from './client';
import {
  UserDetailResponse,
  UpdateProfileRequest,
  UpdateInstrumentsRequest,
  UpdateUserTypesRequest,
  ChangePasswordRequest,
  ChangeEmailRequest,
  MessageResponse,
} from '../../types';

export const usersApi = {
  /**
   * 내 프로필 조회
   */
  getMyProfile: async (): Promise<UserDetailResponse> => {
    const response = await apiClient.get<UserDetailResponse>('/users/me');
    return response.data;
  },

  /**
   * 프로필 수정
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UserDetailResponse> => {
    const response = await apiClient.put<UserDetailResponse>('/users/me', data);
    return response.data;
  },

  /**
   * 악기 정보 수정
   */
  updateInstruments: async (data: UpdateInstrumentsRequest): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>('/users/me/instruments', data);
    return response.data;
  },

  /**
   * 특징 정보 수정
   */
  updateUserTypes: async (data: UpdateUserTypesRequest): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>('/users/me/user-types', data);
    return response.data;
  },

  /**
   * 비밀번호 변경
   */
  changePassword: async (data: ChangePasswordRequest): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>('/users/me/password', data);
    return response.data;
  },

  /**
   * 이메일 변경
   */
  changeEmail: async (data: ChangeEmailRequest): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>('/users/me/email', data);
    return response.data;
  },

  /**
   * 회원 탈퇴
   */
  deleteAccount: async (): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>('/users/me');
    return response.data;
  },

  /**
   * 사용자 검색 (닉네임으로 검색)
   */
  searchUsers: async (params: {
    nickname: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    users: Array<{
      user_id: number;
      nickname: string;
      profile_image_url?: string | null;
      selected_achievement?: {
        achievement_id: number;
        title: string;
        description?: string | null;
        icon_url?: string | null;
      } | null;
    }>;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const response = await apiClient.get('/users/search', { params });
    return response.data;
  },
};

