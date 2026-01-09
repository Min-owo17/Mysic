import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api/admin';
import { commonStyles } from '../../styles/commonStyles';

function PostManagementView() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all'); // all, active, hidden, deleted
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // 검색어 디바운싱 처리
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // 검색어 변경 시 1페이지로 리셋
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const pageSize = 10;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['adminPosts', page, statusFilter, categoryFilter, debouncedSearch],
        queryFn: () => adminApi.getPosts(page, pageSize, categoryFilter, debouncedSearch, statusFilter),
    });

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className={commonStyles.spinner}></div>
            </div>
        );
    }

    if (isError) {
        return <div className="text-center text-red-500 py-10">데이터를 불러오는데 실패했습니다.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">게시글 관리</h1>

            {/* 필터 및 검색 */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:space-x-4">
                <div className="flex-1 space-y-4 md:space-y-0 md:flex md:space-x-4">
                    {/* 상태 필터 */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className={commonStyles.textInput}
                        style={{ maxWidth: '150px' }}
                    >
                        <option value="all">모든 상태</option>
                        <option value="active">정상 게시글</option>
                        <option value="hidden">숨김 처리됨</option>
                        <option value="deleted">삭제됨</option>
                    </select>

                    {/* 카테고리 필터 */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                        className={commonStyles.textInput}
                        style={{ maxWidth: '150px' }}
                    >
                        <option value="all">모든 카테고리</option>
                        <option value="general">자유</option>
                        <option value="question">질문</option>
                        <option value="tip">팁/노하우</option>
                    </select>

                    {/* 검색어 */}
                    <input
                        type="text"
                        placeholder="제목, 내용, 작성자 검색..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={commonStyles.textInput}
                        style={{ maxWidth: '300px' }}
                    />
                </div>
            </div>

            {/* 테이블 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                            <tr>
                                {/* ID 컬럼 제거됨 */}
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-24 hidden md:table-cell">카테고리</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700">제목</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-32 hidden md:table-cell">작성자</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-24 text-center">신고수</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-24 text-center">상태</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-32 hidden md:table-cell">작성일</th>
                                {/* 관리 컬럼 제거됨 */}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data?.posts.map((post) => (
                                <tr
                                    key={post.post_id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/admin/posts/${post.post_id}`)}
                                >
                                    {/* ID 컬럼 제거됨 */}
                                    <td className="p-4 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                                        {post.category}
                                    </td>
                                    <td className="p-4 font-medium text-gray-900 dark:text-white truncate max-w-xs md:max-w-sm">
                                        <span className="hover:text-purple-600 hover:underline">
                                            {post.title}
                                        </span>
                                        {post.is_hidden && <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">숨김</span>}
                                        {post.deleted_at && <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">삭제됨</span>}
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                                        {post.author.nickname}
                                    </td>
                                    <td className={`p-4 text-center font-medium ${(post.report_count || 0) > 0 ? 'text-red-500' : 'text-gray-400'
                                        }`}>
                                        {post.report_count || 0}
                                    </td>
                                    <td className="p-4 text-center">
                                        {post.deleted_at ? (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">삭제됨</span>
                                        ) : post.is_hidden ? (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300">숨김</span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">정상</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm hidden md:table-cell">
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </td>
                                    {/* 관리 컬럼 제거됨 */}
                                </tr>
                            ))}
                            {data?.posts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        게시글이 없습니다.
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
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                    이전
                </button>
                <span className="px-4 py-1 text-gray-700 dark:text-gray-300">
                    {page} / {Math.max(1, Math.ceil((data?.total || 0) / pageSize))}
                </span>
                <button
                    onClick={() => handlePageChange(Math.min(Math.ceil((data?.total || 0) / pageSize), page + 1))}
                    disabled={page >= Math.ceil((data?.total || 0) / pageSize)}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                    다음
                </button>
            </div>
        </div>
    );
}

export default PostManagementView;
