import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi, Group, GroupCreate, GroupInvitation } from '../services/api/groups';
import GroupDetailView from './GroupDetailView';
import { useAppContext } from '../context/AppContext';
import { timeAgo } from '../utils/time';
import { commonStyles } from '../styles/commonStyles';
import toast from 'react-hot-toast';

const GroupsView: React.FC = () => {
  const { 
    userProfile
  } = useAppContext();
  const queryClient = useQueryClient();
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'search' | 'create'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [searchPage, setSearchPage] = useState(1);

  // 그룹 목록 조회 (내가 가입한 그룹)
  const { data: groupsData, isLoading, error } = useQuery({
    queryKey: ['groups', 'my', page],
    queryFn: () => groupsApi.getGroups({
      page,
      page_size: 20,
    }),
    staleTime: 2 * 60 * 1000, // 2분
  });

  // 검색용 그룹 목록 조회 (자신이 포함되지 않은 공개 그룹)
  const { data: searchGroupsData, isLoading: isLoadingSearch } = useQuery({
    queryKey: ['groups', 'search', searchQuery, searchPage],
    queryFn: () => groupsApi.getGroups({
      page: searchPage,
      page_size: 20,
      is_public: true, // 공개 그룹만 검색
      search: searchQuery || undefined,
    }),
    enabled: modalMode === 'search' && searchQuery.trim().length > 0,
    staleTime: 1 * 60 * 1000, // 1분
  });

  // 그룹 생성 Mutation
  const createGroupMutation = useMutation({
    mutationFn: (data: GroupCreate) => groupsApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('그룹이 생성되었습니다.');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '그룹 생성에 실패했습니다.');
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setIsNotificationPanelOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 내가 가입한 그룹 필터링
  const myGroups = useMemo(() => {
    if (!groupsData?.groups) return [];
    return groupsData.groups.filter(g => g.is_member);
  }, [groupsData]);

  // 검색 결과에서 내가 가입하지 않은 그룹만 필터링
  const searchResults = useMemo(() => {
    if (!searchGroupsData?.groups) return [];
    return searchGroupsData.groups.filter(g => !g.is_member);
  }, [searchGroupsData]);

  const handleOpenModal = () => {
    setModalMode('search');
    setSearchQuery('');
    setNewGroupName('');
    setNewGroupDescription('');
    setIsPublic(true);
    setSearchPage(1);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setIsPublic(true);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('그룹 이름을 입력해주세요.');
      return;
    }
    
    createGroupMutation.mutate({
      group_name: newGroupName.trim(),
      description: newGroupDescription.trim() || undefined,
      is_public: isPublic,
      max_members: 50,
    });
  };
  
  const handleSearchGroup = () => {
    if (!searchQuery.trim()) {
      toast.error('검색어를 입력해주세요.');
      return;
    }
    setSearchPage(1);
    // 검색 쿼리는 useQuery의 queryKey에 포함되어 있어서 자동으로 재조회됨
  };

  // 그룹 가입 Mutation
  const joinGroupMutation = useMutation({
    mutationFn: (group_id: number) => groupsApi.joinGroup(group_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'search'] });
      toast.success('그룹에 가입했습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '그룹 가입에 실패했습니다.');
    },
  });

  // 그룹 초대 목록 조회
  const { data: invitationsData, isLoading: isLoadingInvitations } = useQuery({
    queryKey: ['groups', 'invitations', 'pending'],
    queryFn: () => groupsApi.getGroupInvitations({ status: 'pending' }),
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 자동 갱신
  });

  // 그룹 초대 수락 Mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: (invitation_id: number) => groupsApi.acceptInvitation(invitation_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'invitations'] });
      toast.success('그룹 초대를 수락했습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '초대 수락에 실패했습니다.');
    },
  });

  // 그룹 초대 거절 Mutation
  const declineInvitationMutation = useMutation({
    mutationFn: (invitation_id: number) => groupsApi.declineInvitation(invitation_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'invitations'] });
      toast.success('그룹 초대를 거절했습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '초대 거절에 실패했습니다.');
    },
  });

  // 그룹 알림 데이터 변환 (초대 목록을 알림 형식으로 변환)
  const groupNotifications = useMemo(() => {
    if (!invitationsData?.invitations) return [];
    return invitationsData.invitations.map((invitation: GroupInvitation) => ({
      id: `invitation-${invitation.invitation_id}`,
      createdAt: invitation.created_at,
      read: false,
      recipient: userProfile?.nickname || '',
      type: 'group_invite' as const,
      invitationId: invitation.invitation_id.toString(),
      groupId: invitation.group.group_id.toString(),
      groupName: invitation.group.group_name,
      inviter: invitation.inviter.nickname,
    }));
  }, [invitationsData, userProfile]);

  const unreadCount = useMemo(() => groupNotifications.filter(n => !n.read).length, [groupNotifications]);

  const markGroupNotificationsAsRead = () => {
    // 실제로는 백엔드에서 읽음 처리하지만, 현재는 프론트엔드에서만 처리
    // 필요시 백엔드에 읽음 처리 API 추가 가능
  };

  const handleToggleNotifications = () => {
      setIsNotificationPanelOpen(prev => {
          if (!prev && unreadCount > 0) {
              markGroupNotificationsAsRead();
          }
          return !prev;
      });
  };

  const acceptInvitation = (invitationId: string) => {
    acceptInvitationMutation.mutate(parseInt(invitationId));
  };

  const declineInvitation = (invitationId: string) => {
    declineInvitationMutation.mutate(parseInt(invitationId));
  };

  if (selectedGroup) {
    return <GroupDetailView group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  if (isLoading) {
    return (
      <div className={commonStyles.pageContainer}>
        <div className="flex justify-center items-center py-20">
          <div className={`${commonStyles.spinner} w-12 h-12`}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={commonStyles.pageContainer}>
        <div className="text-center py-10 text-red-500">
          <p>그룹 목록을 불러오는 중 오류가 발생했습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isModalOpen && (
        <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
          <div className={`${commonStyles.modalContainer} ${modalMode === 'search' ? 'max-h-[90vh] flex flex-col' : ''}`}>
            <div className={`flex border-b ${commonStyles.divider}`}>
              <button 
                onClick={() => setModalMode('search')}
                className={`${commonStyles.navTab} ${modalMode === 'search' ? commonStyles.navTabActive : commonStyles.navTabInactive}`}
              >
                그룹 검색
              </button>
              <button 
                onClick={() => setModalMode('create')}
                className={`${commonStyles.navTab} ${modalMode === 'create' ? commonStyles.navTabActive : commonStyles.navTabInactive}`}
              >
                새로 만들기
              </button>
            </div>
            
            <div className={`p-6 ${modalMode === 'search' ? 'flex flex-col flex-1 min-h-0' : ''}`}>
              {modalMode === 'search' ? (
                <div className="space-y-4 flex flex-col flex-1 min-h-0">
                  <div className="flex-shrink-0">
                    <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-300">그룹 검색</h3>
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSearchPage(1);
                        }}
                        className={commonStyles.textInputDarkerP3}
                        placeholder="그룹 이름으로 검색..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSearchGroup();
                          }
                        }}
                      />
                      <button 
                        onClick={handleSearchGroup} 
                        className={`${commonStyles.buttonBase} ${commonStyles.indigoButton} !w-auto px-4`}
                        disabled={!searchQuery.trim() || isLoadingSearch}
                      >
                        {isLoadingSearch ? '검색 중...' : '검색'}
                      </button>
                    </div>
                  </div>
                  
                  {/* 검색 결과 표시 */}
                  {searchQuery.trim() && (
                    <div className="mt-4 flex-1 overflow-y-auto min-h-0">
                      {isLoadingSearch ? (
                        <div className="flex justify-center items-center py-10">
                          <div className={`${commonStyles.spinner} w-8 h-8`}></div>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="space-y-3">
                          {searchResults.map(group => (
                            <div key={group.group_id} className={`${commonStyles.card} p-3`}>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-purple-600 dark:text-purple-300">{group.group_name}</h4>
                                  {group.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{group.description}</p>
                                  )}
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    멤버 {group.member_count}명 / 최대 {group.max_members}명
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    joinGroupMutation.mutate(group.group_id);
                                  }}
                                  className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} !w-auto px-4 ml-3`}
                                  disabled={joinGroupMutation.isPending}
                                >
                                  {joinGroupMutation.isPending ? '가입 중...' : '가입'}
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {/* 페이지네이션 */}
                          {searchGroupsData && searchGroupsData.total_pages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <button
                                onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                                disabled={searchPage === 1}
                                className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} !w-auto px-3 py-1 text-sm`}
                              >
                                이전
                              </button>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {searchPage} / {searchGroupsData.total_pages}
                              </span>
                              <button
                                onClick={() => setSearchPage(p => Math.min(searchGroupsData.total_pages, p + 1))}
                                disabled={searchPage === searchGroupsData.total_pages}
                                className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} !w-auto px-3 py-1 text-sm`}
                              >
                                다음
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                          검색 결과가 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-300">새 그룹 만들기</h3>
                  <div>
                    <label className={commonStyles.label}>그룹 이름 *</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className={commonStyles.textInputDarkerP3}
                      placeholder="그룹 이름"
                    />
                  </div>
                  <div>
                    <label className={commonStyles.label}>그룹 설명</label>
                    <textarea
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      className={`${commonStyles.textInputDarkerP3} min-h-[100px] resize-none`}
                      placeholder="그룹에 대한 설명을 입력하세요..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
                      공개 그룹 (다른 사용자도 검색 가능)
                    </label>
                  </div>
                  <button 
                    onClick={handleCreateGroup} 
                    className={`${commonStyles.buttonBase} ${commonStyles.primaryButton}`}
                    disabled={createGroupMutation.isPending || !newGroupName.trim()}
                  >
                    {createGroupMutation.isPending ? '생성 중...' : '만들기'}
                  </button>
                </div>
              )}

              <button onClick={handleCloseModal} className="w-full mt-4 text-center text-gray-500 dark:text-gray-400 text-sm py-2 hover:text-gray-800 dark:hover:text-white">닫기</button>
            </div>
          </div>
        </div>
      )}

      <div className={commonStyles.pageContainer}>
        <div className="flex justify-between items-center mb-6">
            <h1 className={commonStyles.mainTitle}>그룹</h1>
            <div className="flex items-center gap-4">
                 <button
                    onClick={handleOpenModal}
                    className={`hidden md:inline-flex items-center gap-2 ${commonStyles.buttonBase} ${commonStyles.indigoButton}`}
                >
                    <PlusIcon />
                    <span>새 그룹</span>
                </button>
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={handleToggleNotifications}
                        className={`${commonStyles.iconButton} relative`}
                        aria-label="그룹 알림"
                    >
                        <BellIcon />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900 animate-pulse"></span>
                        )}
                    </button>
                    {isNotificationPanelOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 animate-fade-in">
                            <div className={`p-3 border-b ${commonStyles.divider}`}>
                                <h3 className="font-semibold text-gray-800 dark:text-white">그룹 알림</h3>
                            </div>
                            <ul className="max-h-96 overflow-y-auto">
                                {groupNotifications.length > 0 ? (
                                    groupNotifications.map(notif => (
                                        <li key={notif.id} className="border-b border-gray-200/50 dark:border-gray-700/50 last:border-b-0">
                                            { notif.type === 'group_invite' && (
                                                <div className="px-4 py-3">
                                                    <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                                                        <span className="font-bold text-purple-600 dark:text-purple-300">{notif.inviter}</span>님이 <span className="font-bold text-purple-600 dark:text-purple-300">'{notif.groupName}'</span> 그룹에 초대했습니다.
                                                    </p>
                                                    <div className="flex gap-2 mt-2">
                                                        <button onClick={() => acceptInvitation(notif.invitationId!)} className="flex-1 bg-green-100 text-green-700 dark:bg-green-600/20 dark:text-green-300 text-xs font-bold py-1.5 rounded-md hover:bg-green-200 dark:hover:bg-green-600/40">수락</button>
                                                        <button onClick={() => declineInvitation(notif.invitationId!)} className={`${commonStyles.dangerButtonOutline} flex-1 !w-auto text-xs py-1.5`}>거절</button>
                                                    </div>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">{timeAgo(notif.createdAt)}</p>
                                                </div>
                                            )}
                                             { notif.type === 'group_kick' && (
                                                <div className="px-4 py-3">
                                                    <p className="text-sm text-gray-700 dark:text-gray-200">
                                                        <span className="font-bold text-purple-600 dark:text-purple-300">'{notif.groupName}'</span> 그룹에서 제외되었습니다.
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeAgo(notif.createdAt)}</p>
                                                </div>
                                            )}
                                            { notif.type === 'group_delete' && (
                                                <div className="px-4 py-3">
                                                    <p className="text-sm text-gray-700 dark:text-gray-200">
                                                        <span className="font-bold text-purple-600 dark:text-purple-300">'{notif.groupName}'</span> 그룹이 삭제되었습니다.
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeAgo(notif.createdAt)}</p>
                                                </div>
                                            )}
                                        </li>
                                    ))
                                ) : (
                                    <li className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">
                                        새로운 그룹 알림이 없습니다.
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {myGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myGroups.map(group => (
                <div key={group.group_id} className={`${commonStyles.card} flex flex-col`}>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-bold text-purple-600 dark:text-purple-300">{group.group_name}</h2>
                      {group.current_user_role === 'owner' && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-600/20 dark:text-yellow-300 px-2 py-1 rounded-full">그룹장</span>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{group.description}</p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      멤버: {group.member_count}명 / 최대 {group.max_members}명
                    </p>
                    {!group.is_public && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">비공개 그룹</p>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedGroup(group)}
                    className="mt-4 w-full text-center bg-purple-100 text-purple-700 dark:bg-purple-600/50 dark:text-purple-200 font-semibold py-2 px-4 rounded-md hover:bg-purple-200 dark:hover:bg-purple-600/70 transition-colors">
                    그룹 보기
                  </button>
                </div>
              ))}
          </div>
        ) : (
             <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <p>소속된 그룹이 없습니다.</p>
                <p className="mt-2 text-sm">새로운 그룹을 만들거나 찾아보세요!</p>
            </div>
        )}

        {/* 페이지네이션 */}
        {groupsData && groupsData.total_pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} !w-auto px-4`}
            >
              이전
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {page} / {groupsData.total_pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(groupsData.total_pages, p + 1))}
              disabled={page === groupsData.total_pages}
              className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} !w-auto px-4`}
            >
              다음
            </button>
          </div>
        )}

        <button
          onClick={handleOpenModal}
          className="md:hidden fixed bottom-20 right-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-transform transform hover:scale-110"
          aria-label="그룹 생성 또는 찾기"
        >
            <PlusIcon />
        </button>
      </div>
    </>
  );
};

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

export default GroupsView;
