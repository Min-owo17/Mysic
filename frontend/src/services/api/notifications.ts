import apiClient from './client';

export interface Notification {
    notification_id: number;
    receiver_id: number;
    sender_id: number | null;
    sender_nickname: string | null;
    type: 'like' | 'comment' | 'reply' | 'excellent_post' | 'report_hidden' | 'report_deleted';
    post_id: number | null;
    comment_id: number | null;
    content: string | null;
    is_read: boolean;
    created_at: string;
}

export interface NotificationListResponse {
    notifications: Notification[];
    unread_count: number;
}

export const notificationsApi = {
    getNotifications: async (): Promise<NotificationListResponse> => {
        const response = await apiClient.get<NotificationListResponse>('/notifications');
        return response.data;
    },

    markAsRead: async (notificationId: number): Promise<Notification> => {
        const response = await apiClient.patch<Notification>(
            `/notifications/${notificationId}/read`
        );
        return response.data;
    },

    markAllAsRead: async (): Promise<{ message: string }> => {
        const response = await apiClient.post<{ message: string }>(
            '/notifications/read-all'
        );
        return response.data;
    },
};
