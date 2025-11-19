// Common types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// User types
export interface User {
  user_id: number;
  email: string;
  nickname: string;
  profile_image_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at?: string;
}

// Instrument types
export interface InstrumentResponse {
  instrument_id: number;
  name: string;
  display_order: number;
  created_at: string;
}

// UserType types
export interface UserTypeResponse {
  user_type_id: number;
  name: string;
  display_order: number;
  created_at: string;
}

// UserProfile types
export interface UserProfileInstrumentResponse {
  instrument_id: number;
  instrument_name: string;
  is_primary: boolean;
}

export interface UserProfileUserTypeResponse {
  user_type_id: number;
  user_type_name: string;
}

export interface UserProfileResponse {
  profile_id: number;
  user_id: number;
  bio?: string | null;
  hashtags?: string[] | null;
  instruments: UserProfileInstrumentResponse[];
  user_types: UserProfileUserTypeResponse[];
  created_at: string;
  updated_at: string;
}

export interface UserDetailResponse {
  user_id: number;
  email: string;
  nickname: string;
  profile_image_url?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  profile?: UserProfileResponse | null;
}

// User API Request types
export interface UpdateProfileRequest {
  nickname?: string;
  profile_image_url?: string;
  bio?: string;
  hashtags?: string[];
}

export interface UpdateInstrumentsRequest {
  instrument_ids: number[];
  primary_instrument_id?: number;
}

export interface UpdateUserTypesRequest {
  user_type_ids: number[];
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface MessageResponse {
  message: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// PerformanceRecord types
export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string; // ISO string
  likes?: number;
  likedBy?: string[];
  replies?: Comment[];
}

export interface PerformanceRecord {
  id: string;
  date: string; // ISO string
  title: string;
  instrument: string;
  duration: number; // in seconds
  notes: string;
  summary: string; // AI-generated summary
}

export interface Group {
  id: string;
  name: string;
  owner: string;
  members: string[];
  uniqueId: string;
}

export interface BoardPost {
  id: string;
  title: string;
  author: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string for edits
  isDeleted?: boolean;
  tags?: string[];
  comments?: Comment[];
  likes?: number;
  likedBy?: string[];
}

export interface UserProfile {
  nickname: string;
  instrument: string;
  features: string[];
  profilePicture?: string | null;
  email: string;
  password?: string;
  title?: string;
  userCode: string;
  bookmarkedPosts?: string[];
  socialProvider?: 'Google' | 'Kakao' | 'Naver';
}

export enum View {
  RECORD = 'RECORD',
  CALENDAR = 'CALENDAR',
  GROUPS = 'GROUPS',
  BOARD = 'BOARD',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
}

export interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  invitedUserNickname: string;
  inviterNickname: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Notification {
  id: string;
  createdAt: string;
  read: boolean;
  recipient: string; // The user who should receive this notification
  type: 'comment' | 'reply' | 'group_invite' | 'group_kick' | 'group_delete';
  
  // for comments/replies
  postId?: string;
  postTitle?: string;
  commenter?: string;

  // for group notifications
  invitationId?: string;
  groupId?: string;
  groupName?: string;
  inviter?: string;
}

export interface AppContextType {
  records: PerformanceRecord[];
  addRecord: (record: Omit<PerformanceRecord, 'id'>) => void;
  resetRecords: () => void;
  posts: BoardPost[];
  addPost: (post: Omit<BoardPost, 'id' | 'createdAt' | 'author'>) => void;
  updatePost: (postId: string, postData: Pick<BoardPost, 'title' | 'content' | 'tags'>) => void;
  deletePost: (postId: string) => void;
  addComment: (postId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'author'>) => void;
  addReply: (postId: string, parentCommentId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'author'>) => void;
  togglePostLike: (postId: string) => void;
  toggleCommentLike: (postId: string, commentId: string) => void;
  togglePostBookmark: (postId: string) => void;
  userProfile: UserProfile;
  updateProfile: (profile: UserProfile) => void;
  deleteAccount: () => void;
  userProfiles: { [key: string]: Partial<Pick<UserProfile, 'profilePicture' | 'title'>> };
  allUsers: UserProfile[];
  groups: Group[];
  addGroup: (groupName: string) => void;
  leaveGroup: (groupId: string) => void;
  kickMember: (groupId: string, memberName: string) => void;
  deleteGroup: (groupId: string) => void;
  transferOwnership: (groupId: string, newOwnerName: string) => void;
  sendGroupInvitation: (groupId: string, memberName: string) => void;
  acceptInvitation: (invitationId: string) => void;
  declineInvitation: (invitationId: string) => void;
  postNotifications: Notification[];
  groupNotifications: Notification[];
  markPostNotificationsAsRead: () => void;
  markGroupNotificationsAsRead: () => void;
  setCurrentView: (view: View) => void;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

