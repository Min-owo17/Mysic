import apiClient from './client';
import {
  AchievementListResponse,
  UserAchievementListResponse,
  MessageResponse,
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

  /**
   * 대표 칭호 선택
   */
  selectAchievement: async (achievementId: number | null): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>('/achievements/my/select', null, {
      params: { achievement_id: achievementId },
    });
    return response.data;
  },
};



