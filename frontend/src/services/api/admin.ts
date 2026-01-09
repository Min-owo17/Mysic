import apiClient from './client';
import {
    AdminUserListResponse,
    UserDetailResponse,
    PostListResponse,
    PostResponse,
    MessageResponse,
    AchievementListResponse,
    AchievementResponse,
    AchievementCreateRequest,
    AchievementUpdateRequest
} from '../../types';

export const adminApi = {
    /**
     * 사용자 목록 조회
     */
    getUsers: async (page: number = 1, pageSize: number = 20, search?: string, isActive?: boolean): Promise<AdminUserListResponse> => {
        const params: any = {
            skip: (page - 1) * pageSize,
            limit: pageSize,
        };
        if (search) params.search = search;
        if (isActive !== undefined) params.is_active = isActive;

        const response = await apiClient.get<AdminUserListResponse>('/admin/users', { params });
        return response.data;
    },

    /**
     * 사용자 정보 수정
     */
    updateUser: async (userId: number, data: { nickname?: string; email?: string; is_active?: boolean; is_admin?: boolean; membership_tier?: string }): Promise<UserDetailResponse> => {
        const response = await apiClient.patch<UserDetailResponse>(`/admin/users/${userId}`, data);
        return response.data;
    },

    /**
     * 사용자 상태 변경
     */
    updateUserStatus: async (userId: number, isActive: boolean): Promise<UserDetailResponse> => {
        const response = await apiClient.patch<UserDetailResponse>(`/admin/users/${userId}/status`, { is_active: isActive });
        return response.data;
    },

    /**
     * 게시글 목록 조회 (관리자용)
     */
    getPosts: async (page: number = 1, pageSize: number = 20, category?: string, search?: string, statusFilter?: string): Promise<PostListResponse> => {
        const params: any = {
            page,
            page_size: pageSize,
        };
        if (category && category !== 'all') params.category = category;
        if (search) params.search = search;
        if (statusFilter && statusFilter !== 'all') params.status_filter = statusFilter;

        // board 라우터의 admin 경로 사용
        const response = await apiClient.get<PostListResponse>('/board/admin/posts', { params });
        return response.data;
    },

    /**
     * 게시글 상태 변경 (숨김/복구/삭제)
     */
    updatePostStatus: async (postId: number, data: { is_hidden?: boolean; is_deleted?: boolean }): Promise<PostResponse> => {
        const response = await apiClient.patch<PostResponse>(`/board/admin/posts/${postId}/status`, data);
        return response.data;
    },

    /**
     * 게시글 영구 삭제 (Soft Delete) - DELETE 메서드 사용
     */
    deletePost: async (postId: number): Promise<MessageResponse> => {
        const response = await apiClient.delete<MessageResponse>(`/board/admin/posts/${postId}`);
        return response.data;
    },

    /**
     * 게시글 상세 조회 (관리자용)
     */
    getPost: async (postId: number): Promise<PostResponse> => {
        const response = await apiClient.get<PostResponse>(`/board/admin/posts/${postId}`);
        return response.data;
    },

    /**
     * 칭호 목록 조회 (관리자용 - 전체 목록)
     */
    getAchievements: async (): Promise<AchievementListResponse> => {
        const response = await apiClient.get<AchievementListResponse>('/achievements');
        return response.data;
    },

    /**
     * 칭호 생성
     */
    createAchievement: async (data: AchievementCreateRequest): Promise<AchievementResponse> => {
        const response = await apiClient.post<AchievementResponse>('/achievements', data);
        return response.data;
    },

    /**
     * 칭호 수정
     */
    updateAchievement: async (id: number, data: AchievementUpdateRequest): Promise<AchievementResponse> => {
        const response = await apiClient.patch<AchievementResponse>(`/achievements/${id}`, data);
        return response.data;
    },

    /**
     * 칭호 삭제
     */
    deleteAchievement: async (id: number): Promise<MessageResponse> => {
        const response = await apiClient.delete<MessageResponse>(`/achievements/${id}`);
        return response.data;
    },
};
