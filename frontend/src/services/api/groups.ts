import apiClient from './client';

// 그룹 API 타입 정의
export interface GroupOwner {
  user_id: number;
  nickname: string;
  profile_image_url?: string | null;
}

export interface GroupMember {
  member_id: number;
  user_id: number;
  nickname: string;
  profile_image_url?: string | null;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface Group {
  group_id: number;
  group_name: string;
  description?: string | null;
  owner_id: number;
  owner: GroupOwner;
  is_public: boolean;
  max_members: number;
  member_count: number;
  current_user_role?: 'owner' | 'admin' | 'member' | null;
  is_member: boolean;
  created_at: string;
}

export interface GroupListResponse {
  groups: Group[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GroupMemberListResponse {
  members: GroupMember[];
  total: number;
}

export interface GroupCreate {
  group_name: string;
  description?: string;
  is_public?: boolean;
  max_members?: number;
}

export interface GroupUpdate {
  group_name?: string;
  description?: string;
  is_public?: boolean;
  max_members?: number;
}

export interface MessageResponse {
  message: string;
}

export interface GroupInvitation {
  invitation_id: number;
  group_id: number;
  group: {
    group_id: number;
    group_name: string;
    description?: string | null;
    is_public: boolean;
  };
  inviter_id: number;
  inviter: {
    user_id: number;
    nickname: string;
    profile_image_url?: string | null;
  };
  invitee_id: number;
  invitee: {
    user_id: number;
    nickname: string;
    profile_image_url?: string | null;
  };
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface GroupInvitationListResponse {
  invitations: GroupInvitation[];
  total: number;
}

export interface GroupInvitationCreate {
  invitee_id: number;
}

export const groupsApi = {
  /**
   * 그룹 목록 조회
   */
  getGroups: async (params?: {
    page?: number;
    page_size?: number;
    is_public?: boolean;
    search?: string;
  }): Promise<GroupListResponse> => {
    const response = await apiClient.get<GroupListResponse>('/groups', { params });
    return response.data;
  },

  /**
   * 그룹 생성
   */
  createGroup: async (data: GroupCreate): Promise<Group> => {
    const response = await apiClient.post<Group>('/groups', data);
    return response.data;
  },

  /**
   * 그룹 상세 조회
   */
  getGroup: async (group_id: number): Promise<Group> => {
    const response = await apiClient.get<Group>(`/groups/${group_id}`);
    return response.data;
  },

  /**
   * 그룹 가입
   */
  joinGroup: async (group_id: number): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/groups/${group_id}/join`);
    return response.data;
  },

  /**
   * 그룹 탈퇴
   */
  leaveGroup: async (group_id: number): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>(`/groups/${group_id}/leave`);
    return response.data;
  },

  /**
   * 그룹 멤버 목록 조회
   */
  getGroupMembers: async (group_id: number): Promise<GroupMemberListResponse> => {
    const response = await apiClient.get<GroupMemberListResponse>(`/groups/${group_id}/members`);
    return response.data;
  },

  /**
   * 그룹 정보 수정
   */
  updateGroup: async (group_id: number, data: GroupUpdate): Promise<Group> => {
    const response = await apiClient.put<Group>(`/groups/${group_id}`, data);
    return response.data;
  },

  /**
   * 그룹 삭제
   */
  deleteGroup: async (group_id: number): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>(`/groups/${group_id}`);
    return response.data;
  },

  /**
   * 그룹 초대 보내기
   */
  inviteMember: async (group_id: number, data: GroupInvitationCreate): Promise<GroupInvitation> => {
    const response = await apiClient.post<GroupInvitation>(`/groups/${group_id}/invitations`, data);
    return response.data;
  },

  /**
   * 내가 받은 그룹 초대 목록 조회
   */
  getGroupInvitations: async (params?: {
    status?: 'pending' | 'accepted' | 'declined' | 'expired';
  }): Promise<GroupInvitationListResponse> => {
    // params가 undefined이거나 빈 객체인 경우를 처리
    const queryParams: Record<string, string> = {};
    if (params?.status) {
      queryParams.status = params.status;
    }
    const response = await apiClient.get<GroupInvitationListResponse>('/groups/invitations', { 
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined 
    });
    return response.data;
  },

  /**
   * 그룹 초대 수락
   */
  acceptInvitation: async (invitation_id: number): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/groups/invitations/${invitation_id}/accept`);
    return response.data;
  },

  /**
   * 그룹 초대 거절
   */
  declineInvitation: async (invitation_id: number): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/groups/invitations/${invitation_id}/decline`);
    return response.data;
  },
};

