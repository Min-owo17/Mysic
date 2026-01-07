import apiClient from './client';

export interface SupportCreate {
    type: 'inquiry' | 'suggestion';
    title: string;
    content: string;
}

export interface SupportResponse {
    support_id: number;
    user_id: number;
    type: 'inquiry' | 'suggestion';
    title: string;
    content: string;
    status: 'pending' | 'answered';
    answer_content?: string;
    answered_at?: string;
    created_at: string;
    updated_at?: string;
}

export interface SupportListResponse {
    supports: SupportResponse[];
    total: number;
}

export const supportApi = {
    /**
     * 새로운 문의 또는 제안 제출
     */
    createSupport: async (data: SupportCreate): Promise<SupportResponse> => {
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
    getAllSupportsAdmin: async (): Promise<SupportListResponse> => {
        const response = await apiClient.get<SupportListResponse>('/support/admin/all');
        return response.data;
    },

    /**
     * 문의에 대한 답변 등록 (관리자용)
     */
    answerSupportAdmin: async (supportId: number, answerContent: string): Promise<SupportResponse> => {
        const response = await apiClient.post<SupportResponse>(`/support/admin/${supportId}/answer`, {
            answer_content: answerContent
        });
        return response.data;
    }
};
