import apiClient from './client';

// 게시판 API 타입 정의
export interface PostAuthor {
  user_id: number;
  nickname: string;
  profile_image_url?: string | null;
  selected_achievement?: {
    achievement_id: number;
    title: string;
    description?: string | null;
    icon_url?: string | null;
  } | null;
}

export interface Post {
  post_id: number;
  user_id: number;
  author: PostAuthor;
  title: string;
  content: string;
  category: string;
  tags?: string[] | null;  // manual_tags (이전에 manual_tags로 저장된 태그)
  view_count: number;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
  updated_at?: string | null;  // 수정된 적이 없으면 null
}

export interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PostCreate {
  title: string;
  content: string;
  category?: string;
  manual_tags?: string[];
}

export interface PostUpdate {
  title?: string;
  content?: string;
  category?: string;
  manual_tags?: string[];
}

export interface PostReportCreate {
  reason: string;
  details?: string;
}

export interface CommentAuthor {
  user_id: number;
  nickname: string;
  profile_image_url?: string | null;
  selected_achievement?: {
    achievement_id: number;
    title: string;
    description?: string | null;
    icon_url?: string | null;
  } | null;
}

export interface PostComment {
  comment_id: number;
  post_id: number;
  user_id: number;
  author: CommentAuthor;
  parent_comment_id?: number | null;
  content: string;
  like_count: number;
  is_liked: boolean;
  replies: PostComment[];
  deleted_at?: string | null;  // 삭제된 댓글인 경우 삭제 시간
  created_at: string;
  updated_at?: string | null;  // 수정된 적이 없으면 null
}

export interface CommentListResponse {
  comments: PostComment[];
  total: number;
}

export interface CommentCreate {
  content: string;
  parent_comment_id?: number | null;
}

export interface CommentUpdate {
  content: string;
}

export interface LikeResponse {
  is_liked: boolean;
  like_count: number;
}

export interface MessageResponse {
  message: string;
}

export const boardApi = {
  /**
   * 게시글 목록 조회
   */
  getPosts: async (params?: {
    page?: number;
    page_size?: number;
    category?: string;
    tag?: string;
    search?: string;
    author_id?: number;
    bookmarked_only?: boolean;
  }): Promise<PostListResponse> => {
    const response = await apiClient.get<PostListResponse>('/board/posts', { params });
    return response.data;
  },

  /**
   * 게시글 작성
   */
  createPost: async (data: PostCreate): Promise<Post> => {
    const response = await apiClient.post<Post>('/board/posts', data);
    return response.data;
  },

  /**
   * 게시글 상세 조회
   */
  getPost: async (postId: number): Promise<Post> => {
    const response = await apiClient.get<Post>(`/board/posts/${postId}`);
    return response.data;
  },

  /**
   * 게시글 수정
   */
  updatePost: async (postId: number, data: PostUpdate): Promise<Post> => {
    const response = await apiClient.put<Post>(`/board/posts/${postId}`, data);
    return response.data;
  },

  /**
   * 게시글 삭제
   */
  deletePost: async (postId: number): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>(`/board/posts/${postId}`);
    return response.data;
  },

  /**
   * 게시글 좋아요 토글
   */
  togglePostLike: async (postId: number): Promise<LikeResponse> => {
    const response = await apiClient.post<LikeResponse>(`/board/posts/${postId}/likes`);
    return response.data;
  },

  /**
   * 게시글 북마크 토글
   */
  togglePostBookmark: async (postId: number): Promise<{ is_bookmarked: boolean }> => {
    const response = await apiClient.post<{ is_bookmarked: boolean }>(`/board/posts/${postId}/bookmarks`);
    return response.data;
  },

  /**
   * 게시글 신고
   */
  reportPost: async (postId: number, data: PostReportCreate): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/board/posts/${postId}/report`, data);
    return response.data;
  },

  /**
   * 댓글 목록 조회
   */
  getComments: async (postId: number): Promise<CommentListResponse> => {
    const response = await apiClient.get<CommentListResponse>(`/board/posts/${postId}/comments`);
    return response.data;
  },

  /**
   * 댓글 작성
   */
  createComment: async (postId: number, data: CommentCreate): Promise<PostComment> => {
    const response = await apiClient.post<PostComment>(`/board/posts/${postId}/comments`, data);
    return response.data;
  },

  /**
   * 댓글 수정
   */
  updateComment: async (commentId: number, data: CommentUpdate): Promise<PostComment> => {
    const response = await apiClient.put<PostComment>(`/board/comments/${commentId}`, data);
    return response.data;
  },

  /**
   * 댓글 삭제
   */
  deleteComment: async (commentId: number): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>(`/board/comments/${commentId}`);
    return response.data;
  },

  /**
   * 댓글 좋아요 토글
   */
  toggleCommentLike: async (commentId: number): Promise<LikeResponse> => {
    const response = await apiClient.post<LikeResponse>(`/board/comments/${commentId}/likes`);
    return response.data;
  },
};

