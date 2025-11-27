import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { groupsApi, Group, GroupMember } from '../services/api/groups';
import { usersApi } from '../services/api/users';
import { useAppContext } from '../context/AppContext';
import { useAuthStore } from '../store/slices/authSlice';
import { formatTime } from '../utils/time';
import { getLocalDateString } from '../utils/time';
import { defaultAvatar } from '../utils/avatar';
import MemberCalendarModal from './MemberCalendarModal';
import { commonStyles } from '../styles/commonStyles';
import toast from 'react-hot-toast';
import { PerformanceRecord } from '../types';

interface GroupDetailViewProps {
  group: Group;
  onBack: () => void;
}

// Expanded mock data to include profile pictures and more historical records
const MOCK_USERS_DATA: { [key: string]: { records: Omit<PerformanceRecord, 'id'>[] } } = {
    'Miles D.': {
        records: [
            { date: new Date().toISOString(), title: 'Cool Jazz Licks', instrument: '트럼펫', duration: 1850, notes: '', summary: 'Practiced modal interchanges.' },
            { date: new Date(Date.now() - 86400000 * 2).toISOString(), title: 'Scale Practice', instrument: '트럼펫', duration: 920, notes: '', summary: 'Focused on chromatic scales.' },
            { date: new Date(Date.now() - 86400000 * 5).toISOString(), title: 'Bebop Patterns', instrument: '트럼펫', duration: 2100, notes: '', summary: 'Worked through Giant Steps changes.' },
        ]
    },
    'Yo-Yo Ma': {
        records: [
             { date: new Date().toISOString(), title: 'Bach Cello Suite No. 1', instrument: '첼로', duration: 2400, notes: '', summary: 'Worked on the prelude.' },
             { date: new Date(Date.now() - 86400000 * 3).toISOString(), title: 'Elgar Concerto', instrument: '첼로', duration: 3600, notes: '', summary: 'First movement practice.' },
        ]
    },
    'Itzhak P.': {
        records: [
             { date: new Date(Date.now() - 86400000).toISOString(), title: 'Paganini Caprice No. 24', instrument: '바이올린', duration: 3100, notes: '', summary: 'Focused on the variations.' }
        ]
    },
    'John C.': {
        records: []
    }
};

const GroupMemberMenu: React.FC<{
    onKick: () => void;
    onMakeOwner: () => void;
}> = ({ onKick, onMakeOwner }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700">
                <KebabMenuIcon />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-700 border border-gray-600 rounded-md shadow-xl z-20 animate-fade-in">
                    <ul>
                        <li><button onClick={onMakeOwner} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-purple-600">그룹장으로 지정</button></li>
                        <li><button onClick={onKick} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white">그룹에서 제외</button></li>
                    </ul>
                </div>
            )}
        </div>
    );
};

const InviteMemberModal: React.FC<{
    group: Group;
    onClose: () => void;
}> = ({ group, onClose }) => {
    const { userProfile } = useAppContext();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [invitedMembers, setInvitedMembers] = useState<number[]>([]); // user_id로 변경
    const [searchPage, setSearchPage] = useState(1);
    const modalRef = useRef<HTMLDivElement>(null);

    // 그룹 멤버 목록 조회 (이미 가입한 멤버 제외용)
    const { data: membersData } = useQuery({
        queryKey: ['groups', group.group_id, 'members'],
        queryFn: () => groupsApi.getGroupMembers(group.group_id),
        staleTime: 1 * 60 * 1000, // 1분
    });

    // 사용자 검색 API 호출
    const { data: searchUsersData, isLoading: isLoadingSearch } = useQuery({
        queryKey: ['users', 'search', searchQuery, searchPage],
        queryFn: () => usersApi.searchUsers({
            nickname: searchQuery,
            page: searchPage,
            page_size: 20,
        }),
        enabled: searchQuery.trim().length > 0,
        staleTime: 30 * 1000, // 30초
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [onClose]);

    // 검색 결과에서 이미 그룹 멤버인 사용자 제외
    const searchableUsers = React.useMemo(() => {
        if (!searchUsersData?.users) return [];
        
        const currentMemberIds = new Set(
            membersData?.members.map(m => m.user_id) || []
        );
        
        const currentUserId = user?.user_id;
        return searchUsersData.users.filter(
            u => !currentMemberIds.has(u.user_id) && (currentUserId ? u.user_id !== currentUserId : true)
        );
    }, [searchUsersData, membersData, user]);

    // 그룹 초대 Mutation
    const inviteMemberMutation = useMutation({
        mutationFn: async (user_id: number) => {
            return await groupsApi.inviteMember(group.group_id, { invitee_id: user_id });
        },
        onSuccess: (data) => {
            setInvitedMembers(prev => [...prev, data.invitee_id]);
            toast.success('초대를 보냈습니다.');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || '초대 전송에 실패했습니다.');
        },
    });

    const handleInvite = (user_id: number, nickname: string) => {
        if (invitedMembers.includes(user_id)) {
            return;
        }
        // TODO: 실제 API 연동 필요
        inviteMemberMutation.mutate(user_id);
        toast.success(`${nickname}님에게 초대를 보냈습니다.`);
    };

    return (
        <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
            <div ref={modalRef} className={`${commonStyles.modalContainer} flex flex-col max-h-[90vh]`}>
                <div className={`p-4 border-b ${commonStyles.divider} flex-shrink-0`}>
                    <h3 className="text-xl font-bold text-purple-300">멤버 초대</h3>
                    <div className="relative mt-3">
                        <input
                            type="text"
                            placeholder="닉네임으로 검색..."
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                setSearchPage(1); // 검색어 변경 시 페이지 리셋
                            }}
                            className={`${commonStyles.textInputDarkerP3} pl-10`}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && searchQuery.trim()) {
                                    setSearchPage(1);
                                }
                            }}
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingSearch ? (
                        <div className="flex justify-center items-center py-10">
                            <div className={`${commonStyles.spinner} w-8 h-8`}></div>
                        </div>
                    ) : searchQuery.trim() ? (
                        searchableUsers.length > 0 ? (
                            <>
                                {searchableUsers.map(user => {
                                    const isInvited = invitedMembers.includes(user.user_id);
                                    return (
                                        <div key={user.user_id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={user.profile_image_url || defaultAvatar(user.nickname)} 
                                                    alt={user.nickname} 
                                                    className="w-10 h-10 rounded-full bg-gray-700 object-cover" 
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                      {user.selected_achievement && (
                                                        <span className="text-xs text-purple-300 font-medium flex items-center gap-1">
                                                          [
                                                          {user.selected_achievement.icon_url ? (
                                                            <img 
                                                              src={user.selected_achievement.icon_url} 
                                                              alt={user.selected_achievement.title}
                                                              className="w-3 h-3 object-contain inline"
                                                            />
                                                          ) : (
                                                            <span>🏆</span>
                                                          )}
                                                          {' '}
                                                          {user.selected_achievement.title}]
                                                        </span>
                                                      )}
                                                      <p className="font-semibold text-gray-200">{user.nickname}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleInvite(user.user_id, user.nickname)}
                                                disabled={isInvited || inviteMemberMutation.isPending}
                                                className={`text-sm font-semibold py-1.5 px-4 rounded-md transition-colors ${
                                                    isInvited 
                                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                                }`}
                                            >
                                                {isInvited ? '초대 보냄' : '초대 보내기'}
                                            </button>
                                        </div>
                                    );
                                })}
                                
                                {/* 페이지네이션 */}
                                {searchUsersData && searchUsersData.total_pages > 1 && (
                                    <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-700">
                                        <button
                                            onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                                            disabled={searchPage === 1}
                                            className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} !w-auto px-3 py-1 text-sm`}
                                        >
                                            이전
                                        </button>
                                        <span className="text-sm text-gray-400">
                                            {searchPage} / {searchUsersData.total_pages}
                                        </span>
                                        <button
                                            onClick={() => setSearchPage(p => Math.min(searchUsersData.total_pages, p + 1))}
                                            disabled={searchPage === searchUsersData.total_pages}
                                            className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} !w-auto px-3 py-1 text-sm`}
                                        >
                                            다음
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                검색 결과가 없습니다.
                            </p>
                        )
                    ) : (
                        <p className="text-gray-500 text-center py-8">
                            닉네임을 입력하여 사용자를 검색하세요.
                        </p>
                    )}
                </div>

                <div className={`p-4 border-t ${commonStyles.divider} flex-shrink-0`}>
                    <button onClick={onClose} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>닫기</button>
                </div>
            </div>
        </div>
    );
};


const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group: initialGroup, onBack }) => {
    const { userProfile, userProfiles, records: myRecords } = useAppContext();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    
    const [viewingMemberData, setViewingMemberData] = useState<{ name: string; records: PerformanceRecord[]; profilePicture: string | null; } | null>(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
    const [memberToKick, setMemberToKick] = useState<GroupMember | null>(null);
    const [memberToPromote, setMemberToPromote] = useState<GroupMember | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editGroupName, setEditGroupName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(false);

    // 그룹 상세 정보 조회 (최신 정보를 위해)
    const { data: groupData, isLoading: isLoadingGroup } = useQuery({
        queryKey: ['groups', initialGroup.group_id],
        queryFn: () => groupsApi.getGroup(initialGroup.group_id),
        initialData: initialGroup,
        staleTime: 1 * 60 * 1000, // 1분
    });

    // 그룹 멤버 목록 조회
    const { data: membersData, isLoading: isLoadingMembers } = useQuery({
        queryKey: ['groups', initialGroup.group_id, 'members'],
        queryFn: () => groupsApi.getGroupMembers(initialGroup.group_id),
        staleTime: 1 * 60 * 1000, // 1분
    });

    // 그룹 멤버별 통계 조회 (멤버 목록에 표시용)
    const { data: memberStatistics } = useQuery({
        queryKey: ['groups', initialGroup.group_id, 'members', 'statistics'],
        queryFn: () => groupsApi.getGroupMemberStatistics(initialGroup.group_id),
        staleTime: 2 * 60 * 1000, // 2분
    });

    const group = groupData || initialGroup;
    const isOwner = group.current_user_role === 'owner';
    const isMember = group.is_member;

    // 그룹 탈퇴 Mutation
    const leaveGroupMutation = useMutation({
        mutationFn: () => groupsApi.leaveGroup(group.group_id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            toast.success('그룹에서 탈퇴했습니다.');
            onBack();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || '그룹 탈퇴에 실패했습니다.');
        },
    });

    // 그룹 삭제 Mutation
    const deleteGroupMutation = useMutation({
        mutationFn: () => groupsApi.deleteGroup(group.group_id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            toast.success('그룹이 삭제되었습니다.');
            onBack();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || '그룹 삭제에 실패했습니다.');
        },
    });

    // 그룹 정보 수정 Mutation
    const updateGroupMutation = useMutation({
        mutationFn: (data: { group_name?: string; description?: string; is_public?: boolean; max_members?: number }) => 
            groupsApi.updateGroup(group.group_id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups', group.group_id] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            toast.success('그룹 정보가 수정되었습니다.');
            setIsEditModalOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || '그룹 정보 수정에 실패했습니다.');
        },
    });

    const getMemberData = (member: GroupMember) => {
        const normalizedMemberName = member.nickname;

        // API에서 받은 프로필 이미지 URL 사용
        const profileImageUrl = member.profile_image_url || defaultAvatar(normalizedMemberName);

        if (normalizedMemberName === userProfile.nickname) {
            return {
                name: userProfile.nickname,
                user_id: member.user_id,
                profilePicture: profileImageUrl,
                title: userProfile.title,
                records: myRecords
            };
        }
        
        const profile = userProfiles[normalizedMemberName] || {};
        const mockData = MOCK_USERS_DATA[normalizedMemberName] || { records: [] };
        
        return {
            name: normalizedMemberName,
            user_id: member.user_id,
            profilePicture: profileImageUrl,
            title: profile.title,
            records: mockData.records.map((r, i) => ({ ...r, id: `mock-${normalizedMemberName}-${i}` })),
        };
    };

    const handleOpenEditModal = () => {
        setEditGroupName(group.group_name);
        setEditDescription(group.description || '');
        setEditIsPublic(group.is_public);
        setIsEditModalOpen(true);
    };

    const handleUpdateGroup = () => {
        if (!editGroupName.trim()) {
            toast.error('그룹 이름을 입력해주세요.');
            return;
        }
        updateGroupMutation.mutate({
            group_name: editGroupName.trim(),
            description: editDescription.trim() || undefined,
            is_public: editIsPublic,
        });
    };

    const handleLeaveGroup = () => {
        leaveGroupMutation.mutate();
        setShowLeaveConfirm(false);
    };

    const handleDeleteGroup = () => {
        deleteGroupMutation.mutate();
        setShowDeleteGroupConfirm(false);
    };

    const handleKickMember = () => {
        if (memberToKick) {
            // TODO: 실제 API 연동 필요 (현재는 백엔드에 해당 기능이 없음)
            toast.error('멤버 제외 기능은 아직 구현되지 않았습니다.');
            setMemberToKick(null);
        }
    };
    
    const handleTransferOwnership = () => {
        if (memberToPromote) {
            // TODO: 실제 API 연동 필요 (현재는 백엔드에 해당 기능이 없음)
            toast.error('그룹장 위임 기능은 아직 구현되지 않았습니다.');
            setMemberToPromote(null);
        }
    };

    if (isLoadingGroup) {
        return (
            <div className="p-4 md:p-6 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
                <div className="flex justify-center items-center py-20">
                    <div className={`${commonStyles.spinner} w-12 h-12`}></div>
                </div>
            </div>
        );
    }

    return (
        <>
            {viewingMemberData && (
                <MemberCalendarModal 
                    memberData={viewingMemberData}
                    onClose={() => setViewingMemberData(null)}
                />
            )}
            
            {isInviteModalOpen && (
                <InviteMemberModal group={group} onClose={() => setIsInviteModalOpen(false)} />
            )}

            {showLeaveConfirm && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainer} p-6 text-center`}>
                        <h3 className="text-xl font-bold text-red-400 mb-2">그룹 탈퇴</h3>
                        <p className="text-gray-300 mb-6">정말로 '{group.group_name}' 그룹을 탈퇴하시겠습니까?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowLeaveConfirm(false)} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button 
                                onClick={handleLeaveGroup} 
                                className={`${commonStyles.buttonBase} ${commonStyles.dangerButton}`}
                                disabled={leaveGroupMutation.isPending}
                            >
                                {leaveGroupMutation.isPending ? '처리 중...' : '탈퇴'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showDeleteGroupConfirm && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainer} p-6 text-center`}>
                        <h3 className="text-xl font-bold text-red-400 mb-2">그룹 삭제</h3>
                        <p className="text-gray-300 mb-6">'{group.group_name}' 그룹을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowDeleteGroupConfirm(false)} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button 
                                onClick={handleDeleteGroup} 
                                className={`${commonStyles.buttonBase} ${commonStyles.dangerButton}`}
                                disabled={deleteGroupMutation.isPending}
                            >
                                {deleteGroupMutation.isPending ? '처리 중...' : '삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {memberToKick && (
                 <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainer} p-6 text-center`}>
                        <h3 className="text-xl font-bold text-red-400 mb-2">멤버 제외</h3>
                        <p className="text-gray-300 mb-6">'{memberToKick.nickname}'님을 그룹에서 제외하시겠습니까?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setMemberToKick(null)} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button onClick={handleKickMember} className={`${commonStyles.buttonBase} ${commonStyles.dangerButton}`}>제외</button>
                        </div>
                    </div>
                </div>
            )}
            
            {memberToPromote && (
                 <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainer} p-6 text-center`}>
                        <h3 className="text-xl font-bold text-yellow-400 mb-2">그룹장 위임</h3>
                        <p className="text-gray-300 mb-6">'{memberToPromote.nickname}'님에게 그룹장 권한을 위임하시겠습니까? 그룹장 권한을 잃게 됩니다.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setMemberToPromote(null)} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button onClick={handleTransferOwnership} className={`${commonStyles.buttonBase} w-full bg-yellow-600 text-white hover:bg-yellow-500`}>위임</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainerLarge} p-6`}>
                        <h3 className="text-xl font-bold text-purple-600 dark:text-purple-300 mb-4">그룹 정보 수정</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={commonStyles.label}>그룹 이름 *</label>
                                <input
                                    type="text"
                                    value={editGroupName}
                                    onChange={(e) => setEditGroupName(e.target.value)}
                                    className={commonStyles.textInputDarkerP3}
                                    placeholder="그룹 이름"
                                />
                            </div>
                            <div>
                                <label className={commonStyles.label}>그룹 설명</label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className={`${commonStyles.textInputDarkerP3} min-h-[100px] resize-none`}
                                    placeholder="그룹에 대한 설명을 입력하세요..."
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="editIsPublic"
                                    checked={editIsPublic}
                                    onChange={(e) => setEditIsPublic(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <label htmlFor="editIsPublic" className="text-sm text-gray-700 dark:text-gray-300">
                                    공개 그룹 (다른 사용자도 검색 가능)
                                </label>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button 
                                    onClick={() => setIsEditModalOpen(false)} 
                                    className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}
                                    disabled={updateGroupMutation.isPending}
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={handleUpdateGroup} 
                                    className={`${commonStyles.buttonBase} ${commonStyles.primaryButton}`}
                                    disabled={updateGroupMutation.isPending || !editGroupName.trim()}
                                >
                                    {updateGroupMutation.isPending ? '수정 중...' : '수정'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 md:p-6 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center relative">
                        {/* 모바일: 통계 버튼을 화면 우측에 배치 */}
                        <div className="md:hidden absolute -top-10 right-0">
                            <button
                                onClick={() => navigate(`/groups/${initialGroup.group_id}/statistics`, { state: { from: 'group-detail' } })}
                                className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors"
                                aria-label="그룹 통계 보기"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </button>
                        </div>
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className={commonStyles.mainTitle}>{group.group_name}</h1>
                            {group.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                멤버 {group.member_count}명 / 최대 {group.max_members}명
                                {!group.is_public && ' • 비공개 그룹'}
                            </p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                        {isOwner && (
                            <button
                                onClick={handleOpenEditModal}
                                className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} !w-auto px-4 py-2`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                수정
                            </button>
                        )}
                        <button
                            onClick={() => navigate(`/groups/${initialGroup.group_id}/statistics`, { state: { from: 'group-detail' } })}
                            className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors"
                            aria-label="그룹 통계 보기"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <h2 className={`${commonStyles.subTitle} mb-4`}>멤버 목록</h2>

                {isLoadingMembers ? (
                    <div className="flex justify-center items-center py-10">
                        <div className={`${commonStyles.spinner} w-8 h-8`}></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {membersData?.members.map(member => {
                            const memberData = getMemberData(member);
                            const todayStr = getLocalDateString(new Date());
                            const todayRecords = memberData.records.filter(record => getLocalDateString(new Date(record.date)) === todayStr);
                            
                            // 멤버별 통계 정보 찾기
                            const memberStat = memberStatistics?.members.find(stat => stat.user_id === member.user_id);
                            
                            return (
                                <div key={member.member_id} className={commonStyles.card + ' flex flex-col'}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <button onClick={() => setViewingMemberData(memberData)} className="flex-shrink-0">
                                                <img src={memberData.profilePicture!} alt={`${memberData.name} profile`} className="w-10 h-10 rounded-full object-cover bg-gray-700" />
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  {member.selected_achievement && (
                                                    <span className="text-xs text-purple-300 font-medium flex items-center gap-1">
                                                      [
                                                      {member.selected_achievement.icon_url ? (
                                                        <img 
                                                          src={member.selected_achievement.icon_url} 
                                                          alt={member.selected_achievement.title}
                                                          className="w-3 h-3 object-contain inline"
                                                        />
                                                      ) : (
                                                        <span>🏆</span>
                                                      )}
                                                      {' '}
                                                      {member.selected_achievement.title}]
                                                    </span>
                                                  )}
                                                  <h3 className="text-base font-bold text-purple-300 leading-tight truncate">{memberData.name}</h3>
                                                  {member.role === 'owner' && <CrownIcon />}
                                                  {member.role === 'admin' && (
                                                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300 px-2 py-0.5 rounded-full">관리자</span>
                                                  )}
                                                </div>
                                                {memberData.title && <p className="text-xs text-yellow-300 leading-tight mt-1 truncate">{memberData.title}</p>}
                                                
                                                {/* 멤버 통계 정보 */}
                                                {memberStat && (
                                                    <div className="flex gap-2 mt-2 text-xs text-gray-400 flex-wrap">
                                                        <span>총 {formatTime(memberStat.total_practice_time)}</span>
                                                        <span>{memberStat.total_sessions}회</span>
                                                        {memberStat.consecutive_days > 0 && (
                                                            <span className="text-purple-300">{memberStat.consecutive_days}일 연속</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isOwner && user && member.user_id !== user.user_id && member.role !== 'owner' && (
                                            <div className="flex-shrink-0 ml-2">
                                                <GroupMemberMenu
                                                    onKick={() => setMemberToKick(member)}
                                                    onMakeOwner={() => setMemberToPromote(member)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {todayRecords.length > 0 ? (
                                        <div className="mt-auto space-y-2 pt-3 border-t border-gray-700">
                                            <p className="text-xs text-gray-400">오늘의 연습</p>
                                            {todayRecords.map(record => (
                                                <div key={record.id} className="bg-gray-900/50 p-2 rounded-md">
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-sm truncate">{record.title}</p>
                                                            <p className="text-xs text-gray-400">{record.instrument}</p>
                                                        </div>
                                                        <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded ml-2 flex-shrink-0">{formatTime(record.duration)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 mt-auto pt-3 border-t border-gray-700 text-xs">오늘 연습 기록이 없습니다.</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                
                <div className={`mt-8 pt-6 ${commonStyles.divider} grid grid-cols-1 md:flex md:flex-row gap-4 md:justify-center items-center`}>
                    {isOwner && (
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className={`${commonStyles.buttonBase} ${commonStyles.indigoButton} w-full md:max-w-sm flex items-center justify-center gap-2 py-3`}
                        >
                            <InviteIcon />
                            멤버 초대
                        </button>
                    )}
                
                    {isOwner ? (
                        <button
                            onClick={() => setShowDeleteGroupConfirm(true)}
                            className={`${commonStyles.buttonBase} ${commonStyles.dangerButton} w-full md:max-w-sm flex items-center justify-center gap-2 py-3 !bg-red-600/80 hover:!bg-red-600`}
                        >
                            <TrashIcon />
                            그룹 삭제
                        </button>
                    ) : isMember ? (
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className={`${commonStyles.buttonBase} ${commonStyles.dangerButtonOutline} w-full md:max-w-sm flex items-center justify-center gap-2 py-3`}
                        >
                            <LeaveIcon />
                            그룹 탈퇴
                        </button>
                    ) : (
                        <button
                            onClick={async () => {
                                try {
                                    await groupsApi.joinGroup(group.group_id);
                                    queryClient.invalidateQueries({ queryKey: ['groups'] });
                                    toast.success('그룹에 가입했습니다.');
                                } catch (error: any) {
                                    toast.error(error.response?.data?.detail || '그룹 가입에 실패했습니다.');
                                }
                            }}
                            className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} w-full md:max-w-sm flex items-center justify-center gap-2 py-3`}
                        >
                            <InviteIcon />
                            그룹 가입
                        </button>
                    )}
                    {isOwner && (
                        <p className="text-xs text-gray-500 mt-4 w-full text-center col-span-full md:col-span-1">그룹을 나가려면 먼저 다른 멤버에게 그룹장 권한을 위임해야 합니다.</p>
                    )}
                </div>
            </div>
        </>
    );
};

const InviteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" />
    </svg>
);

const LeaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

const CrownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
);

const KebabMenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
);

export default GroupDetailView;
