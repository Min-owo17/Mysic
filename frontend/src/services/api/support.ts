import apiClient from './client';
import { SupportCreateRequest, SupportResponse, SupportListResponse } from '../../types';

export const supportApi = {
    /**
     * 새로운 문의 또는 제안 제출
     */
    createSupport: async (data: SupportCreateRequest): Promise<SupportResponse> => {
        const response = await apiClient.post<SupportResponse>('/support', data);
        return response.data;
    },

    /**
     * 내 문의 내역 목록 조회
     */
    getMySupports: async (): Promise<SupportListResponse> => {
        const response = await apiClient.get<SupportListResponse>('/support/my');
        return response.data;
    },

    /**
     * 전체 문의 내역 조회 (관리자용)
     */
    getAdminInquiries: async (page = 1, limit = 20, status?: string, type?: string): Promise<SupportListResponse> => {
        const response = await apiClient.get<SupportListResponse>('/support/admin/inquiries', {
            params: {
                skip: (page - 1) * limit,
                limit,
                status,
                type,
            },
        });
        return response.data;
    },

    /**
     * 문의에 대한 답변 등록 (관리자용)
     */
    answerInquiry: async (supportId: number, answerContent: string): Promise<SupportResponse> => {
        const response = await apiClient.post<SupportResponse>(`/support/admin/${supportId}/answer`, {
            answer_content: answerContent
        });
        return response.data;
    }
};

