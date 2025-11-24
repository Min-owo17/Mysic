

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Group, PerformanceRecord, UserProfile } from '../types';
import { formatTime } from '../utils/time';
import { useAppContext } from '../context/AppContext';
import { getLocalDateString } from '../utils/time';
import { defaultAvatar } from '../utils/avatar';
import MemberCalendarModal from './MemberCalendarModal';
import { commonStyles } from '../styles/commonStyles';

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
    const { allUsers, sendGroupInvitation, userProfile } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [invitedMembers, setInvitedMembers] = useState<string[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        // Use `capture` phase to prevent clicks on buttons inside the modal from closing it immediately
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [onClose]);

    const searchableUsers = useMemo(() => {
        const currentMemberNames = new Set(group.members.map(m => m === 'You' ? userProfile.nickname : m));
        
        let users = allUsers.filter(u => !currentMemberNames.has(u.nickname));
        
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            users = users.filter(u => 
                u.nickname.toLowerCase().includes(lowercasedQuery) ||
                u.userCode.toLowerCase().includes(lowercasedQuery)
            );
        }
        return users;
    }, [allUsers, group.members, searchQuery, userProfile.nickname]);
    

    const handleInvite = (memberName: string) => {
        sendGroupInvitation(group.id, memberName);
        setInvitedMembers(prev => [...prev, memberName]);
    };

    return (
        <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
            <div ref={modalRef} className={`${commonStyles.modalContainer} flex flex-col max-h-[90vh]`}>
                <div className={`p-4 border-b ${commonStyles.divider} flex-shrink-0`}>
                    <h3 className="text-xl font-bold text-purple-300">멤버 초대</h3>
                    <div className="relative mt-3">
                        <input
                            type="text"
                            placeholder="닉네임 또는 고유 코드로 검색..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={`${commonStyles.textInputDarkerP3} pl-10`}
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {searchableUsers.length > 0 ? searchableUsers.map(user => {
                        const isInvited = invitedMembers.includes(user.nickname);
                        return (
                            <div key={user.userCode} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <img src={user.profilePicture || defaultAvatar(user.nickname)} alt={user.nickname} className="w-10 h-10 rounded-full bg-gray-700" />
                                    <div>
                                        <p className="font-semibold text-gray-200">{user.nickname}</p>
                                        {user.title && <p className="text-xs text-yellow-300">{user.title}</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleInvite(user.nickname)}
                                    disabled={isInvited}
                                    className={`text-sm font-semibold py-1.5 px-4 rounded-md transition-colors ${isInvited ? 'bg-gray-600 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                                >
                                    {isInvited ? '초대 보냄' : '초대 보내기'}
                                </button>
                            </div>
                        );
                    }) : (
                        <p className="text-gray-500 text-center py-8">
                            {searchQuery ? '검색 결과가 없습니다.' : '초대할 사용자를 검색하세요.'}
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


const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group, onBack }) => {
    const { userProfile, userProfiles, records: myRecords, leaveGroup, kickMember, deleteGroup, transferOwnership } = useAppContext();
    const [viewingMemberData, setViewingMemberData] = useState<{ name: string; records: PerformanceRecord[]; profilePicture: string | null; } | null>(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
    const [memberToKick, setMemberToKick] = useState<string | null>(null);
    const [memberToPromote, setMemberToPromote] = useState<string | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    
    const ownerName = group.owner === 'You' ? userProfile.nickname : group.owner;
    const isOwner = userProfile.nickname === ownerName;

    const getMemberData = (memberName: string) => {
        
        const normalizedMemberName = memberName === 'You' ? userProfile.nickname : memberName;

        if (normalizedMemberName === userProfile.nickname) {
            return {
                name: userProfile.nickname,
                profilePicture: userProfile.profilePicture || defaultAvatar(userProfile.nickname),
                title: userProfile.title,
                records: myRecords
            };
        }
        
        const profile = userProfiles[normalizedMemberName] || {};
        const mockData = MOCK_USERS_DATA[normalizedMemberName] || { records: [] };
        
        return {
            name: normalizedMemberName,
            profilePicture: profile.profilePicture || defaultAvatar(normalizedMemberName),
            title: profile.title,
            records: mockData.records.map((r, i) => ({ ...r, id: `mock-${normalizedMemberName}-${i}` })),
        };
    };

    const handleLeaveGroup = () => {
        leaveGroup(group.id);
        setShowLeaveConfirm(false);
        onBack();
    };

    const handleDeleteGroup = () => {
        deleteGroup(group.id);
        setShowDeleteGroupConfirm(false);
        onBack();
    };

    const handleKickMember = () => {
        if (memberToKick) {
            kickMember(group.id, memberToKick);
            setMemberToKick(null);
        }
    };
    
    const handleTransferOwnership = () => {
        if (memberToPromote) {
            transferOwnership(group.id, memberToPromote);
            setMemberToPromote(null);
        }
    };

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
                        <p className="text-gray-300 mb-6">정말로 '{group.name}' 그룹을 탈퇴하시겠습니까?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowLeaveConfirm(false)} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button onClick={handleLeaveGroup} className={`${commonStyles.buttonBase} ${commonStyles.dangerButton}`}>탈퇴</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showDeleteGroupConfirm && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainer} p-6 text-center`}>
                        <h3 className="text-xl font-bold text-red-400 mb-2">그룹 삭제</h3>
                        <p className="text-gray-300 mb-6">'{group.name}' 그룹을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowDeleteGroupConfirm(false)} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button onClick={handleDeleteGroup} className={`${commonStyles.buttonBase} ${commonStyles.dangerButton}`}>삭제</button>
                        </div>
                    </div>
                </div>
            )}
            
            {memberToKick && (
                 <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainer} p-6 text-center`}>
                        <h3 className="text-xl font-bold text-red-400 mb-2">멤버 제외</h3>
                        <p className="text-gray-300 mb-6">'{memberToKick}'님을 그룹에서 제외하시겠습니까?</p>
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
                        <p className="text-gray-300 mb-6">'{memberToPromote}'님에게 그룹장 권한을 위임하시겠습니까? 그룹장 권한을 잃게 됩니다.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setMemberToPromote(null)} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button onClick={handleTransferOwnership} className={`${commonStyles.buttonBase} w-full bg-yellow-600 text-white hover:bg-yellow-500`}>위임</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 md:p-6 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto animate-fade-in">
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className={commonStyles.mainTitle}>{group.name}</h1>
                        <p className="text-sm text-gray-500 font-mono">{group.uniqueId}</p>
                    </div>
                </div>

                <h2 className={`${commonStyles.subTitle} mb-4`}>오늘의 연습 기록</h2>

                <div className="space-y-6">
                    {group.members.map(member => {
                        const memberData = getMemberData(member);
                        const todayStr = getLocalDateString(new Date());
                        const todayRecords = memberData.records.filter(record => getLocalDateString(new Date(record.date)) === todayStr);
                        
                        return (
                            <div key={memberData.name} className={commonStyles.card}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setViewingMemberData(memberData)} className="flex-shrink-0">
                                            <img src={memberData.profilePicture!} alt={`${memberData.name} profile`} className="w-10 h-10 rounded-full object-cover bg-gray-700" />
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-2">
                                              <h3 className="text-lg font-bold text-purple-300 leading-tight">{memberData.name}</h3>
                                              {memberData.name === ownerName && <CrownIcon />}
                                            </div>
                                            {memberData.title && <p className="text-xs text-yellow-300 leading-tight">{memberData.title}</p>}
                                        </div>
                                    </div>
                                    {isOwner && memberData.name !== userProfile.nickname && (
                                        <GroupMemberMenu
                                            onKick={() => setMemberToKick(memberData.name)}
                                            onMakeOwner={() => setMemberToPromote(memberData.name)}
                                        />
                                    )}
                                </div>
                                {todayRecords.length > 0 ? (
                                    <div className="mt-3 space-y-3 pl-1">
                                        {todayRecords.map(record => (
                                            <div key={record.id} className="bg-gray-900/50 p-3 rounded-md">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold">{record.title}</p>
                                                        <p className="text-sm text-gray-400">{record.instrument}</p>
                                                    </div>
                                                    <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">{formatTime(record.duration)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 mt-2 text-sm pl-1">오늘 연습 기록이 없습니다.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                <div className={`mt-8 pt-6 ${commonStyles.divider} space-y-4`}>
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className={`${commonStyles.buttonBase} ${commonStyles.indigoButton} md:max-w-sm md:mx-auto flex items-center justify-center gap-2 py-3`}
                    >
                        <InviteIcon />
                        멤버 초대
                    </button>
                
                    {isOwner ? (
                         <div className="text-center">
                            <button
                                onClick={() => setShowDeleteGroupConfirm(true)}
                                className={`${commonStyles.buttonBase} ${commonStyles.dangerButton} md:max-w-sm md:mx-auto flex items-center justify-center gap-2 py-3 !bg-red-600/80 hover:!bg-red-600`}
                            >
                                <TrashIcon />
                                그룹 삭제
                            </button>
                            <p className="text-xs text-gray-500 mt-2">그룹을 나가려면 먼저 다른 멤버에게 그룹장 권한을 위임해야 합니다.</p>
                         </div>
                    ) : (
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className={`${commonStyles.buttonBase} ${commonStyles.dangerButtonOutline} md:max-w-sm md:mx-auto flex items-center justify-center gap-2 py-3`}
                        >
                            <LeaveIcon />
                            그룹 탈퇴
                        </button>
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
