import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api/admin';
import { UserDetailResponse } from '../../types';
import { commonStyles } from '../../styles/commonStyles';

interface UserEditModalProps {
    user: UserDetailResponse | null;
    onClose: () => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose }) => {
    const queryClient = useQueryClient();
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [membershipTier, setMembershipTier] = useState<string>('FREE');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setNickname(user.nickname);
            setEmail(user.email);
            setIsActive(user.is_active);
            setIsAdmin(user.is_admin);
            setMembershipTier(user.membership_tier || 'FREE');
            setError(null);
        }
    }, [user]);

    const updateMutation = useMutation({
        mutationFn: (data: { nickname: string; email: string; is_active: boolean; is_admin: boolean; membership_tier: string }) =>
            adminApi.updateUser(user!.user_id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            onClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || '사용자 정보 수정에 실패했습니다.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        updateMutation.mutate({
            nickname,
            email,
            is_active: isActive,
            is_admin: isAdmin,
            membership_tier: membershipTier,
        });
    };

    if (!user) return null;

    return (
        <div className={commonStyles.modalOverlay} onClick={onClose}>
            <div
                className={commonStyles.modalContainerLarge}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">사용자 정보 수정</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 닉네임 */}
                        <div>
                            <label className={commonStyles.label}>닉네임</label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className={commonStyles.textInput}
                                required
                            />
                        </div>

                        {/* 이메일 */}
                        <div>
                            <label className={commonStyles.label}>이메일</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={commonStyles.textInput}
                                required
                            />
                        </div>

                        {/* 멤버십 등급 */}
                        <div>
                            <label className={commonStyles.label}>멤버십 등급</label>
                            <select
                                value={membershipTier}
                                onChange={(e) => setMembershipTier(e.target.value)}
                                className={commonStyles.textInput}
                            >
                                <option value="FREE">FREE</option>
                                <option value="CUP">CUP</option>
                                <option value="BOTTLE">BOTTLE</option>
                            </select>
                        </div>

                        {/* 활성 상태 */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">계정 활성화</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">비활성화 시 로그인이 제한됩니다.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsActive(!isActive)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${isActive ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {/* 관리자 권한 */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">관리자 권한</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">관리자 페이지 접근이 가능해집니다.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAdmin(!isAdmin)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${isAdmin ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAdmin ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className={commonStyles.secondaryButton}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className={commonStyles.primaryButton}
                            >
                                {updateMutation.isPending ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserEditModal;
