import apiClient from './client';
import type {
  PracticeSession,
  PracticeStatistics,
  PracticeSessionListResponse,
  PracticeSessionCreate,
  PracticeSessionUpdate,
} from '../../types';

export const practiceApi = {
  /**
   * 연습 세션 시작
   */
  createSession: async (data: PracticeSessionCreate): Promise<PracticeSession> => {
    const response = await apiClient.post<PracticeSession>('/practice/sessions', data);
    return response.data;
  },

  /**
   * 연습 세션 종료
   */
  updateSession: async (sessionId: number, data: PracticeSessionUpdate): Promise<PracticeSession> => {
    const response = await apiClient.put<PracticeSession>(`/practice/sessions/${sessionId}`, data);
    return response.data;
  },

  /**
   * 연습 기록 목록 조회
   */
  getSessions: async (params?: {
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
    instrument?: string;
  }): Promise<PracticeSessionListResponse> => {
    const response = await apiClient.get<PracticeSessionListResponse>('/practice/sessions', { params });
    return response.data;
  },

  /**
   * 연습 세션 상세 조회
   */
  getSession: async (sessionId: number): Promise<PracticeSession> => {
    const response = await apiClient.get<PracticeSession>(`/practice/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * 연습 통계 조회
   */
  getStatistics: async (): Promise<PracticeStatistics> => {
    const response = await apiClient.get<PracticeStatistics>('/practice/statistics');
    return response.data;
  },

  /**
   * 진행 중인 세션 조회
   */
  getActiveSession: async (): Promise<PracticeSession | null> => {
    const response = await apiClient.get<PracticeSession | null>('/practice/sessions/active');
    return response.data;
  },
};

