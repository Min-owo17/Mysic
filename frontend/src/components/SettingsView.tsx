

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/slices/authSlice';
import { View } from '../types';
import { usersApi } from '../services/api/users';
import { commonStyles } from '../styles/commonStyles';

// Mock data for feedback history
const MOCK_FEEDBACK_HISTORY = [
    {
        id: 'fh1',
        type: 'inquiry' as const,
        title: '녹음 파일 분석 오류',
        content: '연주 시간 분석 기능이 가끔 실제 연주 시간보다 훨씬 짧게 측정되는 것 같습니다. 확인 부탁드립니다.',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
        status: 'answered' as const,
        answer: {
            content: '안녕하세요, Virtuoso님. 소중한 의견 감사합니다. 해당 문제는 내부적으로 인지하고 있으며, AI 모델 개선을 통해 정확도를 높이는 작업을 진행 중입니다. 빠른 시일 내에 업데이트하도록 하겠습니다. 이용에 불편을 드려 죄송합니다.',
            answeredAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
        },
    },
    {
        id: 'fh2',
        type: 'suggestion' as const,
        title: '악보 보기 기능 추가 건의',
        content: '연습 기록을 할 때 관련 악보(PDF, 이미지)를 함께 첨부하고 볼 수 있는 기능이 있으면 좋겠습니다.',
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
        status: 'pending' as const,
    }
];

const GoogleIcon = () => (<svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.618-3.226-11.283-7.66l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.863 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>);
const KakaoIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c-5.523 0-10 3.582-10 8 0 2.924 1.933 5.518 4.783 6.91-1.23.974-3.58 2.55-3.58 2.55s.87.21 2.33.02c.025-.002.05-.005.075-.008.31-.03.626-.067.95-.11.91-.12 1.85-.29 2.82-.49 4.38-1.02 6.62-4.23 6.62-7.87 0-4.418-4.477-8-10-8Z"/></svg>);
const NaverIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M16.273 12.845h-4.364v-1.69h4.364V8H8.364v8h8.364v-1.69h-.455v.001Z"/></svg>);


const SettingsView: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, setUser } = useAuthStore();
    
    // 사용자 프로필 조회
    const { data: userProfile, isLoading } = useQuery({
        queryKey: ['userProfile'],
        queryFn: () => usersApi.getMyProfile(),
        enabled: !!user,
    });
    
    const [accountData, setAccountData] = useState({ email: '', password: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const [showResetModal, setShowResetModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteResultModal, setShowDeleteResultModal] = useState(false);
    const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null);
    
    // 비밀번호 확인 모달 (이메일/비밀번호 변경 전)
    const [showConfirmPasswordModal, setShowConfirmPasswordModal] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmError, setConfirmError] = useState('');
    const [pendingAction, setPendingAction] = useState<'email' | 'password' | null>(null);
    
    // 변경 확인 모달
    const [showChangeConfirmModal, setShowChangeConfirmModal] = useState(false);
    const [changeType, setChangeType] = useState<'email' | 'password' | null>(null);
    
    // 비밀번호 틀림 안내 모달
    const [showPasswordErrorModal, setShowPasswordErrorModal] = useState(false);
    
    const [copied, setCopied] = useState(false);

    // --- Feedback Modal State ---
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackType, setFeedbackType] = useState<'inquiry' | 'suggestion'>('inquiry');
    const [feedbackTitle, setFeedbackTitle] = useState('');
    const [feedbackContent, setFeedbackContent] = useState('');
    const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);
    
    // --- History Modal State ---
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);


    useEffect(() => {
        if (userProfile) {
            setAccountData({ email: userProfile.email, password: '' });
        }
    }, [userProfile]);

    const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAccountData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveAccount = async () => {
        if (!userProfile) return;
        
        const isEmailChanged = accountData.email !== userProfile.email;
        const isPasswordChanged = !!accountData.password;

        if (isEmailChanged && isPasswordChanged) {
            // 이메일과 비밀번호 모두 변경하는 경우는 이메일 변경만 처리
            // (비밀번호는 별도로 변경하도록 안내)
            alert('이메일과 비밀번호는 각각 변경해주세요.');
            return;
        }

        if (isEmailChanged) {
            setPendingAction('email');
            setShowConfirmPasswordModal(true);
        } else if (isPasswordChanged) {
            setPendingAction('password');
            setShowConfirmPasswordModal(true);
        }
    };
    
    const handlePasswordConfirm = () => {
        if (!confirmPassword.trim()) {
            setConfirmError('비밀번호를 입력해주세요.');
            return;
        }

        // 비밀번호 확인 모달 닫고 변경 확인 모달 표시
        if (pendingAction === 'email') {
            setShowConfirmPasswordModal(false);
            setShowChangeConfirmModal(true);
            setChangeType('email');
            setConfirmError('');
        } else if (pendingAction === 'password') {
            setShowConfirmPasswordModal(false);
            setShowChangeConfirmModal(true);
            setChangeType('password');
            setConfirmError('');
        }
    };

    const handleChangeConfirm = async () => {
        if (!userProfile) return;

        setIsSaving(true);
        try {
            if (changeType === 'email') {
                // 이메일 변경
                await usersApi.changeEmail({
                    current_password: confirmPassword,
                    new_email: accountData.email,
                });
                
                // 프로필 다시 조회하여 업데이트
                await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
                const updatedProfile = await usersApi.getMyProfile();
                if (updatedProfile && user) {
                    setUser({
                        ...user,
                        email: updatedProfile.email,
                    });
                }
                
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
            } else if (changeType === 'password') {
                // 비밀번호 변경
                await usersApi.changePassword({
                    current_password: confirmPassword,
                    new_password: accountData.password,
                });
                
                // 비밀번호 필드 초기화
                setAccountData(prev => ({ ...prev, password: '' }));
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
            }
            
            setShowChangeConfirmModal(false);
            setChangeType(null);
            setConfirmPassword('');
            setPendingAction(null);
        } catch (error: any) {
            // 비밀번호가 틀린 경우
            if (error.response?.status === 400 && error.response?.data?.detail?.includes('비밀번호')) {
                setShowChangeConfirmModal(false);
                setShowPasswordErrorModal(true);
            } else {
                alert(error.response?.data?.detail || '변경 중 오류가 발생했습니다.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetRecords = () => {
        // TODO: 연습 기록 초기화 API 호출
        setShowResetModal(false);
    };

    const handleDeleteAccount = async () => {
        try {
            // 확인 모달 닫기
            setShowDeleteModal(false);
            
            // 회원 탈퇴 API 호출
            await usersApi.deleteAccount();
            
            // 성공 결과 모달 표시
            setDeleteResult({
                success: true,
                message: '회원 탈퇴가 완료되었습니다. 확인 버튼을 클릭하면 로그인 페이지로 이동합니다.'
            });
            setShowDeleteResultModal(true);
        } catch (error) {
            console.error('회원 탈퇴 오류:', error);
            
            // 실패 결과 모달 표시
            setDeleteResult({
                success: false,
                message: '회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.'
            });
            setShowDeleteResultModal(true);
        }
    };
    
    // 회원 탈퇴 성공 후 확인 버튼 클릭 시 처리
    const handleDeleteResultConfirm = () => {
        // 로그아웃 처리
        setUser(null);
        localStorage.removeItem('access_token');
        queryClient.clear();
        
        // 모달 닫기
        setShowDeleteResultModal(false);
        setDeleteResult(null);
        
        // 로그인 페이지로 이동
        navigate('/auth');
    };
    
    const handleCopyCode = () => {
        if (userProfile?.unique_code) {
            navigator.clipboard.writeText(userProfile.unique_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isAccountSaveDisabled = (!userProfile || (accountData.email === userProfile.email && !accountData.password)) || isSaving;

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 max-w-md md:max-w-2xl mx-auto animate-fade-in">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="p-4 md:p-6 max-w-md md:max-w-2xl mx-auto animate-fade-in">
                <p className="text-center text-gray-600 dark:text-gray-400">사용자 정보를 불러올 수 없습니다.</p>
            </div>
        );
    }

    const handleOpenFeedbackModal = () => {
        setFeedbackType('inquiry');
        setFeedbackTitle('');
        setFeedbackContent('');
        setShowFeedbackSuccess(false);
        setShowFeedbackModal(true);
    };

    const handleCloseFeedbackModal = () => {
        setShowFeedbackModal(false);
    };

    const handleSendFeedback = () => {
        // This is a mock function as requested
        setShowFeedbackModal(false);
        setShowFeedbackSuccess(true);
        setTimeout(() => setShowFeedbackSuccess(false), 2500);
    };

    return (
        <>
            {/* 비밀번호 확인 모달 */}
            {showConfirmPasswordModal && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={commonStyles.confirmModalContainer}>
                        <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-300 mb-2">비밀번호 확인</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">정보 변경을 위해 현재 비밀번호를 입력해주세요.</p>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                            onKeyPress={(e) => { if (e.key === 'Enter') handlePasswordConfirm(); }}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            placeholder="현재 비밀번호"
                            autoFocus
                        />
                        {confirmError && <p className="text-red-500 dark:text-red-400 text-xs mt-2 text-left">{confirmError}</p>}
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => { setShowConfirmPasswordModal(false); setConfirmError(''); setConfirmPassword(''); setPendingAction(null); }} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button onClick={handlePasswordConfirm} className={`${commonStyles.buttonBase} ${commonStyles.primaryButton}`}>확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 변경 확인 모달 */}
            {showChangeConfirmModal && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={commonStyles.confirmModalContainer}>
                        <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-300 mb-2">
                            {changeType === 'email' ? '이메일 변경' : '비밀번호 변경'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                            {changeType === 'email' 
                                ? `이메일을 "${accountData.email}"로 변경하시겠습니까?`
                                : '비밀번호를 변경하시겠습니까?'}
                        </p>
                        <div className="flex gap-4 mt-6">
                            <button 
                                onClick={() => { 
                                    setShowChangeConfirmModal(false); 
                                    setChangeType(null); 
                                    setConfirmPassword(''); 
                                    setPendingAction(null);
                                }} 
                                className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleChangeConfirm} 
                                disabled={isSaving} 
                                className={`${commonStyles.buttonBase} ${commonStyles.primaryButton}`}
                            >
                                {isSaving ? '변경 중...' : '변경'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 비밀번호 틀림 안내 모달 */}
            {showPasswordErrorModal && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={commonStyles.confirmModalContainer}>
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">비밀번호 오류</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">비밀번호가 올바르지 않아 변경할 수 없습니다.</p>
                        <div className="flex gap-4 mt-6">
                            <button 
                                onClick={() => { 
                                    setShowPasswordErrorModal(false); 
                                    setConfirmPassword('');
                                    setPendingAction(null);
                                }} 
                                className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} w-full`}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showResetModal && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={commonStyles.confirmModalContainer}>
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">기록 초기화</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">정말로 모든 연습 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowResetModal(false)} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button onClick={handleResetRecords} className={`${commonStyles.buttonBase} ${commonStyles.dangerButton}`}>초기화</button>
                        </div>
                    </div>
                </div>
            )}
             {showDeleteModal && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={commonStyles.confirmModalContainer}>
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">회원 탈퇴</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">정말로 탈퇴하시겠습니까? 모든 데이터가 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowDeleteModal(false)} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                            <button onClick={handleDeleteAccount} className={`${commonStyles.buttonBase} ${commonStyles.dangerButton}`}>탈퇴</button>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteResultModal && deleteResult && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={commonStyles.confirmModalContainer}>
                        <h3 className={`text-xl font-bold mb-2 ${deleteResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {deleteResult.success ? '탈퇴 완료' : '탈퇴 실패'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">{deleteResult.message}</p>
                        <div className="flex gap-4">
                            {deleteResult.success ? (
                                <button 
                                    onClick={handleDeleteResultConfirm}
                                    className={`${commonStyles.buttonBase} w-full bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`}
                                >
                                    확인
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => {
                                            setShowDeleteResultModal(false);
                                            setDeleteResult(null);
                                        }} 
                                        className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}
                                    >
                                        닫기
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setShowDeleteResultModal(false);
                                            setDeleteResult(null);
                                            setShowDeleteModal(true);
                                        }} 
                                        className={`${commonStyles.buttonBase} ${commonStyles.dangerButton}`}
                                    >
                                        다시 시도
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {showFeedbackModal && (
                 <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={commonStyles.modalContainerLarge}>
                        <div className={`flex border-b ${commonStyles.divider}`}>
                            <button onClick={() => setFeedbackType('inquiry')} className={`${commonStyles.navTab} ${feedbackType === 'inquiry' ? commonStyles.navTabActive : commonStyles.navTabInactive}`}>문의하기</button>
                            <button onClick={() => setFeedbackType('suggestion')} className={`${commonStyles.navTab} ${feedbackType === 'suggestion' ? commonStyles.navTabActive : commonStyles.navTabInactive}`}>제안하기</button>
                        </div>
                        <div className="p-6 space-y-4">
                             <input type="text" value={feedbackTitle} onChange={e => setFeedbackTitle(e.target.value)} placeholder="제목" className={commonStyles.textInputDarkerP3} />
                             <textarea value={feedbackContent} onChange={e => setFeedbackContent(e.target.value)} placeholder="내용을 입력해주세요..." rows={6} className={`${commonStyles.textInputDarkerP3} resize-none`}></textarea>
                             <div className="flex gap-4">
                                <button onClick={handleCloseFeedbackModal} className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton}`}>취소</button>
                                <button onClick={handleSendFeedback} disabled={!feedbackTitle.trim() || !feedbackContent.trim()} className={`${commonStyles.buttonBase} ${commonStyles.primaryButton}`}>보내기</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
            
            {showFeedbackSuccess && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-600/90 text-white text-sm font-semibold py-2 px-4 rounded-full animate-fade-in z-50">
                    소중한 의견 감사합니다!
                </div>
            )}

            {showHistoryModal && (
                <div className={commonStyles.modalOverlay} aria-modal="true" role="dialog">
                    <div className={`${commonStyles.modalContainerLarge} max-w-lg flex flex-col max-h-[90vh]`}>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-xl font-bold text-purple-600 dark:text-purple-300">나의 문의 내역</h3>
                            <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {MOCK_FEEDBACK_HISTORY.map(item => (
                                <div key={item.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <button onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)} className="w-full flex justify-between items-center p-4 text-left">
                                        <div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.status === 'answered' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>{item.status === 'answered' ? '답변완료' : '검토중'}</span>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200 mt-1">{item.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</p>
                                        </div>
                                        <svg className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedHistoryId === item.id ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                    {expandedHistoryId === item.id && (
                                        <div className={`px-4 pb-4 ${commonStyles.divider} animate-fade-in`}>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap py-3">{item.content}</p>
                                            {item.answer && (
                                                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                                    <p className="font-bold text-purple-600 dark:text-purple-300 text-sm">답변</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-500">{new Date(item.answer.answeredAt).toLocaleDateString('ko-KR')}</p>
                                                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-2 whitespace-pre-wrap">{item.answer.content}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}


            <div className="p-4 md:p-6 max-w-md md:max-w-2xl mx-auto animate-fade-in">
                <div className="flex items-center mb-6">
                    <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-300">설정</h1>
                </div>

                <div className="space-y-8">
                    {/* Account Settings */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">계정</h2>
                        <div>
                            <label htmlFor="userCode" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">고유 코드</label>
                            <div className="flex items-center gap-2">
                                <input id="userCode" type="text" value={userProfile.unique_code || ''} readOnly className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-3 font-mono text-gray-500 dark:text-gray-400" />
                                <button onClick={handleCopyCode} className="bg-indigo-600 text-white font-semibold py-2 px-3 rounded-md hover:bg-indigo-500 transition-colors text-sm">
                                    {copied ? '복사됨!' : '복사'}
                                </button>
                            </div>
                        </div>

                        {/* 이메일 변경 (소셜 로그인 사용자가 아닌 경우) */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">이메일</label>
                            <input 
                                type="email" 
                                id="email" 
                                name="email" 
                                value={accountData.email} 
                                onChange={handleAccountChange} 
                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                            />
                        </div>

                        {/* 비밀번호 변경 */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">새 비밀번호</label>
                            <input 
                                type="password" 
                                id="password" 
                                name="password" 
                                value={accountData.password} 
                                onChange={handleAccountChange} 
                                placeholder="변경할 경우에만 입력" 
                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                            />
                        </div>

                        <div className="pt-2">
                            <button 
                                onClick={handleSaveAccount} 
                                disabled={isAccountSaveDisabled} 
                                className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-md hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSaving ? '저장 중...' : '계정 정보 저장'}
                            </button>
                            {showSuccess && <p className="text-green-600 dark:text-green-400 text-center mt-3 text-sm animate-fade-in">계정 정보가 저장되었습니다!</p>}
                        </div>
                    </div>

                    {/* Support */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">고객 지원</h2>
                         <div className="flex gap-4">
                            <button onClick={handleOpenFeedbackModal} className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">문의 및 제안하기</button>
                            <button onClick={() => setShowHistoryModal(true)} className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">나의 문의 내역</button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 border-b border-red-500/20 dark:border-red-500/30 pb-2">위험 구역</h2>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-4 rounded-lg space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-red-700 dark:text-red-300">연습 기록 초기화</p>
                                    <p className="text-xs text-red-600 dark:text-gray-400">모든 연습 기록을 삭제합니다.</p>
                                </div>
                                <button onClick={() => setShowResetModal(true)} className="bg-red-200 text-red-700 dark:bg-red-600/50 dark:text-white font-bold py-2 px-4 rounded-md hover:bg-red-300 dark:hover:bg-red-600/80 transition-colors">초기화</button>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-red-700 dark:text-red-300">회원 탈퇴</p>
                                    <p className="text-xs text-red-600 dark:text-gray-400">모든 데이터를 영구적으로 삭제합니다.</p>
                                </div>
                                <button onClick={() => setShowDeleteModal(true)} className="bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 transition-colors">탈퇴</button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Logout */}
                    <div className="pt-4">
                        <button
                            onClick={() => {
                                setUser(null);
                                localStorage.removeItem('access_token');
                                queryClient.clear();
                                navigate('/auth');
                            }}
                            className="w-full text-center text-gray-500 dark:text-gray-400 py-3 font-semibold hover:text-gray-800 dark:hover:text-white transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsView;