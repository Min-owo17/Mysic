import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api/admin';
import { UserDetailResponse } from '../../types';
import UserEditModal from '../../components/admin/UserEditModal';

function UserManagementView() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
    const [selectedUser, setSelectedUser] = useState<UserDetailResponse | null>(null);
    const pageSize = 10;

    // 사용자 목록 조회 Query
    const { data, isLoading, isError } = useQuery({
        queryKey: ['adminUsers', page, search, activeFilter],
        queryFn: () => adminApi.getUsers(page, pageSize, search || undefined, activeFilter),
    });

    // 상태 변경 Mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
            adminApi.updateUserStatus(userId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
    });

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); // 검색 시 첫 페이지로 이동
    };

    const handleFilterChange = (filter: string) => {
        if (filter === 'all') setActiveFilter(undefined);
        else if (filter === 'active') setActiveFilter(true);
        else if (filter === 'inactive') setActiveFilter(false);
        setPage(1);
    };

    const handleStatusToggle = (user: UserDetailResponse, e: React.MouseEvent) => {
        e.stopPropagation(); // 행 클릭 이벤트 전파 방지
        if (window.confirm(`${user.nickname}님을 ${user.is_active ? '정지' : '활성화'}하시겠습니까?`)) {
            updateStatusMutation.mutate({ userId: user.user_id, isActive: !user.is_active });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (isError) {
        return <div className="text-center text-red-500 py-10">데이터를 불러오는데 실패했습니다.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">사용자 관리</h1>

            {/* 검색 및 필터 */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center space-x-2 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="닉네임 또는 이메일 검색"
                        value={search}
                        onChange={handleSearchChange}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white w-full md:w-64"
                    />
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === undefined
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        전체
                    </button>
                    <button
                        onClick={() => handleFilterChange('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === true
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        활성
                    </button>
                    <button
                        onClick={() => handleFilterChange('inactive')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === false
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        정지
                    </button>
                </div>
            </div>

            {/* 테이블 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 hidden md:table-cell">Unique Code</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700">사용자 정보</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 hidden md:table-cell">가입일</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700">상태</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 text-right hidden md:table-cell">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data?.users.map((user) => (
                                <tr
                                    key={user.user_id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedUser(user)}
                                >
                                    <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm hidden md:table-cell">{user.unique_code}</td>
                                    <td className="p-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                                {user.profile_image_url ? (
                                                    <img src={user.profile_image_url} alt={user.nickname} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white flex items-center">
                                                    {user.nickname}
                                                    {user.is_admin && (
                                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">Admin</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300 text-sm hidden md:table-cell">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        {user.is_active ? (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                활성
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                정지
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right hidden md:table-cell">
                                        <button
                                            onClick={(e) => handleStatusToggle(user, e)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${user.is_active
                                                ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                }`}
                                        >
                                            {user.is_active ? '정지' : '해제'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {data?.users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 페이지네이션 */}
            <div className="flex justify-center mt-6 space-x-2">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                    이전
                </button>
                <span className="px-4 py-1 text-gray-700 dark:text-gray-300">
                    {page} / {data?.total_pages || 1}
                </span>
                <button
                    onClick={() => setPage(p => Math.min(data?.total_pages || 1, p + 1))}
                    disabled={page === (data?.total_pages || 1)}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                    다음
                </button>
            </div>

            {/* 사용자 수정 모달 */}
            {selectedUser && (
                <UserEditModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
}

export default UserManagementView;
