

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Group } from '../types';
import GroupDetailView from './GroupDetailView';
import { useAppContext } from '../context/AppContext';
import { timeAgo } from '../utils/time';
import { commonStyles } from '../styles/commonStyles';

const GroupsView: React.FC = () => {
  const { 
    groups, addGroup, userProfile, 
    groupNotifications, markGroupNotificationsAsRead, 
    acceptInvitation, declineInvitation 
  } = useAppContext();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'search' | 'create'>('search');
  const [searchId, setSearchId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

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

  const unreadCount = useMemo(() => groupNotifications.filter(n => !n.read).length, [groupNotifications]);

  const handleToggleNotifications = () => {
      setIsNotificationPanelOpen(prev => {
          if (!prev && unreadCount > 0) {
              markGroupNotificationsAsRead();
          }
          return !prev;
      });
  };

  const myGroups = groups.filter(g => g.members.includes('You') || g.members.includes(userProfile.nickname));

  const handleOpenModal = () => {
    setModalMode('search');
    setSearchId('');
    setNewGroupName('');
    setSearchResult(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      addGroup(newGroupName);
      handleCloseModal();
    }
  };
  
  const handleSearchGroup = () => {
      const found = groups.find(g => g.uniqueId === searchId);
      if (found) {
          setSearchResult(`'${found.name}' 그룹을 찾았습니다.`);
      } else {
          setSearchResult('해당 ID의 그룹을 찾을 수 없습니다.');
      }
  };

  if (selectedGroup) {
    const currentGroupData = groups.find(g => g.id === selectedGroup.id) ?? selectedGroup;
    return <GroupDetailView group={currentGroupData} onBack={() => setSelectedGroup(null)} />;
  }

  return (
    <>
      {isModalOpen && (
        <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
          <div className={commonStyles.modalContainer}>
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
            
            <div className="p-6">
              {modalMode === 'search' ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-300">고유 번호로 그룹 검색</h3>
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => {
                      setSearchId(e.target.value);
                      setSearchResult(null);
                    }}
                    className={commonStyles.textInputDarkerP3}
                    placeholder="#JAZZ-001"
                  />
                  {searchResult && <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{searchResult}</p>}
                  <button onClick={handleSearchGroup} className={`${commonStyles.buttonBase} ${commonStyles.indigoButton}`}>검색</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-300">새 그룹 만들기</h3>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className={commonStyles.textInputDarkerP3}
                    placeholder="그룹 이름"
                  />
                  <button onClick={handleCreateGroup} className={`${commonStyles.buttonBase} ${commonStyles.primaryButton}`}>만들기</button>
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
                <div key={group.id} className={`${commonStyles.card} flex flex-col`}>
                  <div className="flex-grow">
                    <h2 className="text-xl font-bold text-purple-600 dark:text-purple-300">{group.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">멤버: {group.members.join(', ')}</p>
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