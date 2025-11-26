import apiClient from './client';
import {
  AchievementListResponse,
  UserAchievementListResponse,
} from '../../types';

export const achievementsApi = {
  /**
   * 전체 칭호 목록 조회
   */
  getAllAchievements: async (): Promise<AchievementListResponse> => {
    const response = await apiClient.get<AchievementListResponse>('/achievements');
    return response.data;
  },

  /**
   * 내가 획득한 칭호 목록 조회
   */
  getMyAchievements: async (): Promise<UserAchievementListResponse> => {
    const response = await apiClient.get<UserAchievementListResponse>('/achievements/my');
    return response.data;
  },
};



