import apiClient from './client';
import { UserTypeResponse } from '../../types';

export const userTypesApi = {
  /**
   * 특징 목록 조회
   */
  getUserTypes: async (): Promise<UserTypeResponse[]> => {
    const response = await apiClient.get<UserTypeResponse[]>('/user-types');
    return response.data;
  },
};

